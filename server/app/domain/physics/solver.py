"""Numerical simulation solver for single motorcycle emergency braking runs.

Integrates the 4-state dynamical system via SciPy solve_ivp (RK45) with
terminal boundary events and columnar trajectory decimation (ADR 0004, ADR 0005).
"""

from typing import Callable
import numpy as np
from scipy.integrate import solve_ivp

from app.domain.exceptions import SolverConvergenceError
from app.domain.physics.models import (
    VehicleParams,
    BrakeAssembly,
    EnvironmentParams,
    SimulationConfig,
    SimulationResult,
    TerminalOutcome,
    VehicleState,
)
from app.domain.physics.actuation import BrakeActuationProfile, ProgressiveSqueezeProfile
from app.domain.physics.tire import SUBSTRATE_MATRIX
from app.domain.physics.derivatives import (
    evaluate_system_derivatives,
    compute_instantaneous_telemetry,
)


def simulate_single_vehicle(
    params: VehicleParams | None = None,
    brake_assembly: BrakeAssembly | None = None,
    env: EnvironmentParams | None = None,
    actuation: BrakeActuationProfile | None = None,
    config: SimulationConfig | None = None,
) -> SimulationResult:
    """Execute a single-vehicle emergency braking simulation run.

    Integrates [x, v, ω, T] from t=0 until a terminal event (Safe Stop, Barrier Collision,
    Washout, or Lift-off) or until max_simulation_time.

    Returns:
        SimulationResult: Columnar trajectories resampled to config.num_telemetry_points
                         along with terminal summary metadata.
    """
    params = params or VehicleParams()
    brake_assembly = brake_assembly or BrakeAssembly()
    env = env or EnvironmentParams()
    actuation = actuation or ProgressiveSqueezeProfile()
    config = config or SimulationConfig()

    # Initial state vector: [x=0, v=v0, ω=v0/Rw, T=T0]
    x_0 = 0.0
    v_0 = config.initial_velocity
    omega_0 = v_0 / params.wheel_radius  # pure rolling onset
    t_0 = config.initial_rotor_temp
    y_0 = np.array([x_0, v_0, omega_0, t_0], dtype=np.float64)

    # Derivative wrapper for SciPy solve_ivp
    def rhs(t: float, y: np.ndarray) -> np.ndarray:
        return evaluate_system_derivatives(t, y, params, brake_assembly, env, actuation, config)

    # Substrate critical slip threshold for washout
    kappa_crit = SUBSTRATE_MATRIX[env.substrate].critical_slip

    # 1. Event: Safe Stop (v <= v_stop)
    def event_safe_stop(t: float, y: np.ndarray) -> float:
        return float(y[1] - config.standstill_cutoff_velocity)

    event_safe_stop.terminal = True
    event_safe_stop.direction = -1

    # 2. Event: Barrier Collision (x >= X_hazard)
    def event_barrier_collision(t: float, y: np.ndarray) -> float:
        return float(y[0] - config.hazard_distance)

    event_barrier_collision.terminal = True
    event_barrier_collision.direction = 1

    # 3. Event: Front-Wheel Washout (slip exceeds κ_crit or lateral deficit)
    def event_front_washout(t: float, y: np.ndarray) -> float:
        telem = compute_instantaneous_telemetry(t, y, params, brake_assembly, env, actuation, config)
        if telem.lateral_washout:
            return -1.0
        # Zero-crossing from positive to negative when kappa_f exceeds kappa_crit
        return float(kappa_crit - telem.slip_ratio)

    event_front_washout.terminal = True
    event_front_washout.direction = -1

    # 4. Event: Rear-Wheel Lift-off (F_z,rear <= 0)
    def event_rear_liftoff(t: float, y: np.ndarray) -> float:
        telem = compute_instantaneous_telemetry(t, y, params, brake_assembly, env, actuation, config)
        # Pitch-over occurs when normal load on rear tire drops to zero
        return float(telem.normal_load_rear)

    event_rear_liftoff.terminal = True
    event_rear_liftoff.direction = -1

    events: list[Callable[[float, np.ndarray], float]] = [
        event_safe_stop,
        event_barrier_collision,
        event_front_washout,
        event_rear_liftoff,
    ]

    try:
        sol = solve_ivp(
            fun=rhs,
            t_span=(0.0, config.max_simulation_time),
            y0=y_0,
            method="RK45",
            events=events,
            dense_output=True,
            max_step=0.01,
            rtol=1e-5,
            atol=1e-6,
        )
    except Exception as exc:
        raise SolverConvergenceError(f"Numerical integration failed: {exc}") from exc

    if not sol.success:
        raise SolverConvergenceError(f"ODE integration did not succeed: {sol.message}")

    # Determine terminal outcome
    outcome = TerminalOutcome.SAFE_STOP
    earliest_event_time = float("inf")

    event_outcomes = [
        TerminalOutcome.SAFE_STOP,
        TerminalOutcome.BARRIER_COLLISION,
        TerminalOutcome.FRONT_WHEEL_WASHOUT,
        TerminalOutcome.REAR_WHEEL_LIFTOFF,
    ]

    for idx, t_ev in enumerate(sol.t_events):
        if len(t_ev) > 0 and t_ev[0] < earliest_event_time:
            earliest_event_time = float(t_ev[0])
            outcome = event_outcomes[idx]

    # Fallback outcome determination if integration ended without triggering an event callback
    t_end = float(sol.t[-1])
    y_end = sol.y[:, -1]
    x_end = float(y_end[0])
    v_end = float(y_end[1])

    if earliest_event_time == float("inf"):
        if x_end >= config.hazard_distance:
            outcome = TerminalOutcome.BARRIER_COLLISION
        elif v_end <= config.standstill_cutoff_velocity:
            outcome = TerminalOutcome.SAFE_STOP

    # Build columnar uniform decimation grid
    num_points = config.num_telemetry_points
    # Ensure t_grid spans from 0.0 to t_end cleanly
    if t_end <= 0.0:
        t_grid = np.zeros(num_points, dtype=np.float64)
        y_grid = np.tile(y_0[:, np.newaxis], (1, num_points))
    else:
        t_grid = np.linspace(0.0, t_end, num_points, dtype=np.float64)
        y_grid = sol.sol(t_grid)

    pos_col = y_grid[0, :]
    vel_col = np.maximum(0.0, y_grid[1, :])
    omega_col = np.maximum(0.0, y_grid[2, :])
    temp_col = y_grid[3, :]

    # Compute derived physical telemetry across the uniform grid
    slip_col = np.zeros(num_points, dtype=np.float64)
    fz_front_col = np.zeros(num_points, dtype=np.float64)
    fz_rear_col = np.zeros(num_points, dtype=np.float64)
    fx_front_col = np.zeros(num_points, dtype=np.float64)
    fx_rear_col = np.zeros(num_points, dtype=np.float64)
    tb_front_col = np.zeros(num_points, dtype=np.float64)

    for k in range(num_points):
        yk = y_grid[:, k]
        tk = float(t_grid[k])
        telem_k = compute_instantaneous_telemetry(
            tk, yk, params, brake_assembly, env, actuation, config
        )
        slip_col[k] = telem_k.slip_ratio
        fz_front_col[k] = telem_k.normal_load_front
        fz_rear_col[k] = telem_k.normal_load_rear
        fx_front_col[k] = telem_k.friction_force_front
        fx_rear_col[k] = telem_k.friction_force_rear
        tb_front_col[k] = telem_k.brake_torque_front

    # Summary statistics
    stop_distance = float(pos_col[-1])
    stop_time = float(t_grid[-1])
    impact_velocity = float(vel_col[-1]) if outcome == TerminalOutcome.BARRIER_COLLISION else None

    # Calculate deceleration trajectory: a = - (F_x,total) / m
    decel_col = (fx_front_col + fx_rear_col) / params.mass
    peak_deceleration = float(np.max(decel_col)) if len(decel_col) > 0 else 0.0
    max_temp = float(np.max(temp_col)) if len(temp_col) > 0 else t_0

    return SimulationResult(
        time=t_grid,
        position=pos_col,
        velocity=vel_col,
        wheel_angular_velocity=omega_col,
        temperature=temp_col,
        slip_ratio=slip_col,
        normal_load_front=fz_front_col,
        normal_load_rear=fz_rear_col,
        friction_force_front=fx_front_col,
        friction_force_rear=fx_rear_col,
        brake_torque=tb_front_col,
        terminal_outcome=outcome,
        stop_distance=stop_distance,
        stop_time=stop_time,
        impact_velocity=impact_velocity,
        peak_deceleration=peak_deceleration,
        max_temperature=max_temp,
    )
