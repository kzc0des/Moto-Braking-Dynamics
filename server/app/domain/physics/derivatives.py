"""ODE system right-hand side derivatives (dy/dt) for the 4-state motorcycle state vector.

Coordinates kinematics, dynamic weight transfer, Pacejka traction, and thermodynamics.
"""

from dataclasses import dataclass
import numpy as np

from app.domain.physics.models import (
    VehicleParams,
    BrakeAssembly,
    EnvironmentParams,
    SimulationConfig,
)
from app.domain.physics.actuation import BrakeActuationProfile
from app.domain.physics.weight_transfer import (
    compute_normal_loads,
    evaluate_aerodynamic_drag,
    GRAVITY,
)
from app.domain.physics.tire import (
    SUBSTRATE_MATRIX,
    get_effective_friction,
    evaluate_emergent_slip_ratio,
    pacejka_longitudinal_force,
    evaluate_cornering_friction_budget,
)
from app.domain.physics.brake import (
    evaluate_brake_torque,
    evaluate_temperature_derivative,
)


@dataclass(frozen=True)
class InstantaneousTelemetry:
    """Instantaneous evaluation of internal physical channels at time t."""

    slip_ratio: float
    normal_load_front: float
    normal_load_rear: float
    friction_force_front: float
    friction_force_rear: float
    brake_torque_front: float
    brake_torque_rear: float
    lateral_force_front: float
    lateral_washout: bool


def compute_instantaneous_telemetry(
    t: float,
    y: np.ndarray,
    params: VehicleParams,
    brake_assembly: BrakeAssembly,
    env: EnvironmentParams,
    actuation: BrakeActuationProfile,
    config: SimulationConfig,
) -> InstantaneousTelemetry:
    """Calculate all instantaneous forces, slip, loads, and torques at (t, y)."""
    x = float(y[0])
    v = max(0.0, float(y[1]))
    omega = max(0.0, float(y[2]))
    temp = float(y[3])

    if v <= config.standstill_cutoff_velocity:
        return InstantaneousTelemetry(
            slip_ratio=0.0,
            normal_load_front=params.mass * GRAVITY * (params.cog_distance_rear / params.wheelbase),
            normal_load_rear=params.mass * GRAVITY * (params.cog_distance_front / params.wheelbase),
            friction_force_front=0.0,
            friction_force_rear=0.0,
            brake_torque_front=0.0,
            brake_torque_rear=0.0,
            lateral_force_front=0.0,
            lateral_washout=False,
        )

    # 1. Brake actuation & torque
    p_applied = actuation.applied_pressure(t)
    tb_front = evaluate_brake_torque(brake_assembly, p_applied, temp)
    tb_rear = params.brake_bias_ratio * tb_front

    # 2. Emergent slip ratio
    kappa_f = evaluate_emergent_slip_ratio(
        v, omega, params.wheel_radius, config.low_speed_epsilon, config.standstill_cutoff_velocity
    )

    # 3. Tire adhesion parameters
    mu_eff = get_effective_friction(env)
    coeffs = SUBSTRATE_MATRIX[env.substrate]

    # 4. Normalized front grip factor
    d_norm = 1.0  # normalized peak
    bx = coeffs.stiffness_b * kappa_f
    inner = bx - coeffs.curvature_e * (bx - np.arctan(bx))
    f_shape = float(d_norm * np.sin(coeffs.shape_c * np.arctan(inner))) if kappa_f > 0 else 0.0
    k_f = mu_eff * f_shape

    # 5. Rear brake demand and quasi-steady traction factor
    fx_rear_demand = tb_rear / params.wheel_radius
    static_rear_weight = max(1.0, params.mass * GRAVITY * (params.cog_distance_front / params.wheelbase))
    k_r = min(fx_rear_demand / static_rear_weight, mu_eff) if tb_rear > 0 else 0.0

    # 6. Closed-form dynamic normal load transfer
    fz_front, fz_rear = compute_normal_loads(params, env, v, x, k_f, k_r)

    # 7. Front longitudinal grip with cornering friction ellipse
    fx_front_nominal = pacejka_longitudinal_force(kappa_f, fz_front, mu_eff, coeffs)
    mass_share = params.mass * (fz_front / max(1.0, fz_front + fz_rear))
    fx_front, fy_front, lateral_washout = evaluate_cornering_friction_budget(
        fx_front_nominal, fz_front, v, mass_share, env.curve_radius, mu_eff
    )

    # 8. Clamped rear braking force
    fx_rear_max = mu_eff * fz_rear
    fx_rear = min(fx_rear_demand, fx_rear_max)

    return InstantaneousTelemetry(
        slip_ratio=kappa_f,
        normal_load_front=fz_front,
        normal_load_rear=fz_rear,
        friction_force_front=fx_front,
        friction_force_rear=fx_rear,
        brake_torque_front=tb_front,
        brake_torque_rear=tb_rear,
        lateral_force_front=fy_front,
        lateral_washout=lateral_washout,
    )


def evaluate_system_derivatives(
    t: float,
    y: np.ndarray,
    params: VehicleParams,
    brake_assembly: BrakeAssembly,
    env: EnvironmentParams,
    actuation: BrakeActuationProfile,
    config: SimulationConfig,
) -> np.ndarray:
    """Calculate the 4-state derivative vector dy/dt = [dx/dt, dv/dt, dω/dt, dT/dt].

    Passed directly to scipy.integrate.solve_ivp.
    """
    v = float(y[1])
    omega = float(y[2])
    temp = float(y[3])

    # Standstill safeguard: zero out motion derivatives when halted
    if v <= config.standstill_cutoff_velocity:
        h_conv = 20.0  # static cooling
        q_cooling = h_conv * brake_assembly.surface_area * (temp - env.ambient_temperature)
        dt_halt = -q_cooling / (brake_assembly.rotor_mass * brake_assembly.specific_heat)
        return np.array([0.0, 0.0, 0.0, dt_halt], dtype=np.float64)

    # Calculate instantaneous physical interactions
    telem = compute_instantaneous_telemetry(t, y, params, brake_assembly, env, actuation, config)

    # Forces opposing linear vehicle motion
    f_drag = evaluate_aerodynamic_drag(params, env, v)
    f_gravity = params.mass * GRAVITY * np.sin(env.road_grade_angle)
    f_total_longitudinal = telem.friction_force_front + telem.friction_force_rear + f_drag + f_gravity

    # 1. dx/dt = v
    dx_dt = v

    # 2. dv/dt = -Σ F / m
    dv_dt = -f_total_longitudinal / params.mass

    # 3. dω/dt = (F_x·R_w - T_b) / I_w
    torque_net = (telem.friction_force_front * params.wheel_radius) - telem.brake_torque_front
    dw_dt = torque_net / params.wheel_inertia

    # Prevent wheel from accelerating backward into negative rotational spin
    if omega <= 0.0 and dw_dt < 0.0:
        dw_dt = 0.0

    # 4. dT/dt = (Q_gen - Q_conv) / (m_d · c_p)
    dt_dt = evaluate_temperature_derivative(
        brake_assembly,
        telem.brake_torque_front,
        max(0.0, omega),
        temp,
        v,
        env.ambient_temperature,
    )

    return np.array([dx_dt, dv_dt, dw_dt, dt_dt], dtype=np.float64)
