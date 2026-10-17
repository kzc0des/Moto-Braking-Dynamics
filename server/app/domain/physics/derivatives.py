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
    AbsConfiguration,
)
from app.domain.physics.actuation import BrakeActuationProfile
from app.domain.physics.weight_transfer import (
    compute_normal_loads,
    evaluate_aerodynamic_drag,
    GRAVITY,
)
from app.domain.physics.tire import (
    SUBSTRATE_MATRIX,
    PacejkaCoefficients,
    get_effective_friction,
    evaluate_emergent_slip_ratio,
    pacejka_longitudinal_force,
    evaluate_cornering_friction_budget,
    evaluate_tire_pressure_scaling,
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
    abs_active_front: bool = False
    abs_active_rear: bool = False
    rear_lockup: bool = False


def compute_instantaneous_telemetry(
    t: float,
    y: np.ndarray,
    params: VehicleParams,
    brake_assembly: BrakeAssembly,
    env: EnvironmentParams,
    actuation: BrakeActuationProfile,
    config: SimulationConfig,
    rear_brake_assembly: BrakeAssembly | None = None,
    abs_configuration: AbsConfiguration = AbsConfiguration.NONE,
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
            abs_active_front=False,
            abs_active_rear=False,
            rear_lockup=False,
        )

    # 1. Brake actuation & line torque
    p_applied = actuation.applied_pressure(t)
    tb_front_raw = evaluate_brake_torque(brake_assembly, p_applied, temp)
    if hasattr(actuation, "applied_rear_pressure"):
        p_rear = actuation.applied_rear_pressure(t)
        rear_asm = rear_brake_assembly if rear_brake_assembly is not None else brake_assembly
        tb_rear_raw = evaluate_brake_torque(rear_asm, p_rear, temp)
    else:
        tb_rear_raw = params.brake_bias_ratio * tb_front_raw

    # 2. Emergent slip ratio
    kappa_f = evaluate_emergent_slip_ratio(
        v, omega, params.wheel_radius, config.low_speed_epsilon, config.standstill_cutoff_velocity
    )

    # 3. Tire adhesion parameters with independent front/rear inflation scaling (ADR 0028)
    mu_base = get_effective_friction(env)
    coeffs_base = SUBSTRATE_MATRIX[env.substrate]

    mu_scale_f, stiff_scale_f = evaluate_tire_pressure_scaling(
        params.front_tire_pressure_psi, nominal_psi=29.0
    )
    mu_eff_front = mu_base * mu_scale_f
    coeffs_front = PacejkaCoefficients(
        base_friction=coeffs_base.base_friction,
        stiffness_b=coeffs_base.stiffness_b * stiff_scale_f,
        shape_c=coeffs_base.shape_c,
        curvature_e=coeffs_base.curvature_e,
        critical_slip=coeffs_base.critical_slip,
    )

    mu_scale_r, stiff_scale_r = evaluate_tire_pressure_scaling(
        params.rear_tire_pressure_psi, nominal_psi=33.0
    )
    mu_eff_rear = mu_base * mu_scale_r

    # 4. Normalized front grip factor
    d_norm = 1.0  # normalized peak
    bx = coeffs_front.stiffness_b * kappa_f
    inner = bx - coeffs_front.curvature_e * (bx - np.arctan(bx))
    f_shape = float(d_norm * np.sin(coeffs_front.shape_c * np.arctan(inner))) if kappa_f > 0 else 0.0
    k_f = mu_eff_front * f_shape

    # 5. Rear brake demand and quasi-steady traction factor
    fx_rear_demand = tb_rear_raw / params.wheel_radius
    static_rear_weight = max(1.0, params.mass * GRAVITY * (params.cog_distance_front / params.wheelbase))
    k_r = min(fx_rear_demand / static_rear_weight, mu_eff_rear) if tb_rear_raw > 0 else 0.0

    # 6. Closed-form dynamic normal load transfer
    fz_front, fz_rear = compute_normal_loads(params, env, v, x, k_f, k_r)

    # 7. Front ABS Modulation & Traction (ADR 0027)
    has_front_abs = abs_configuration in (
        AbsConfiguration.SINGLE_CHANNEL_FRONT,
        AbsConfiguration.DUAL_CHANNEL,
    )
    abs_active_front = False
    kappa_crit_front = coeffs_front.critical_slip
    fx_front_peak = mu_eff_front * fz_front

    if has_front_abs and kappa_f >= (kappa_crit_front * 0.95):
        # Solenoid valve pulse modulation caps torque at peak tire grip (η_abs ≈ 0.94)
        eta_abs = 0.94
        fx_front_nominal = eta_abs * fx_front_peak
        tb_front = min(tb_front_raw, fx_front_nominal * params.wheel_radius)
        kappa_f = min(kappa_f, kappa_crit_front)
        abs_active_front = True
    else:
        tb_front = tb_front_raw
        fx_front_nominal = pacejka_longitudinal_force(kappa_f, fz_front, mu_eff_front, coeffs_front)

    mass_share = params.mass * (fz_front / max(1.0, fz_front + fz_rear))
    fx_front, fy_front, lateral_washout = evaluate_cornering_friction_budget(
        fx_front_nominal, fz_front, v, mass_share, env.curve_radius, mu_eff_front
    )

    # 8. Rear ABS vs Conventional Lockup Modulation (ADR 0027)
    has_rear_abs = abs_configuration == AbsConfiguration.DUAL_CHANNEL
    abs_active_rear = False
    rear_lockup = False
    fx_rear_max = mu_eff_rear * fz_rear

    if has_rear_abs:
        if fx_rear_demand > fx_rear_max:
            # Dual-Channel ABS intervenes: regulates at 94% of available peak adhesion
            fx_rear = 0.94 * fx_rear_max
            tb_rear = fx_rear * params.wheel_radius
            abs_active_rear = True
        else:
            fx_rear = fx_rear_demand
            tb_rear = tb_rear_raw
    else:
        # Non-ABS rear (conventional disc or mechanical drum):
        if fx_rear_demand > fx_rear_max and fx_rear_demand > 50.0:
            # Wheel lockup occurs! Reduced to sliding friction, lateral stability compromised
            fx_rear = 0.85 * fx_rear_max
            tb_rear = tb_rear_raw
            rear_lockup = True
        else:
            fx_rear = min(fx_rear_demand, fx_rear_max)
            tb_rear = tb_rear_raw

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
        abs_active_front=abs_active_front,
        abs_active_rear=abs_active_rear,
        rear_lockup=rear_lockup,
    )


def evaluate_system_derivatives(
    t: float,
    y: np.ndarray,
    params: VehicleParams,
    brake_assembly: BrakeAssembly,
    env: EnvironmentParams,
    actuation: BrakeActuationProfile,
    config: SimulationConfig,
    rear_brake_assembly: BrakeAssembly | None = None,
    abs_configuration: AbsConfiguration = AbsConfiguration.NONE,
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
    telem = compute_instantaneous_telemetry(
        t,
        y,
        params,
        brake_assembly,
        env,
        actuation,
        config,
        rear_brake_assembly,
        abs_configuration,
    )

    # Forces opposing linear vehicle motion
    f_drag = evaluate_aerodynamic_drag(params, env, v)
    f_gravity = params.mass * GRAVITY * np.sin(env.road_grade_angle)
    f_total_longitudinal = telem.friction_force_front + telem.friction_force_rear + f_drag + f_gravity

    # 1. dx/dt = v
    dx_dt = v

    # 2. dv/dt = -Σ F / m
    dv_dt = -f_total_longitudinal / params.mass

    # 3. dω/dt = (F_x·R_w - T_b) / I_w
    if telem.abs_active_front:
        # ABS solenoid actively cycles line pressure, tracking critical slip without lockup
        target_omega = max(0.0, (v * (1.0 - telem.slip_ratio)) / params.wheel_radius)
        # Smooth proportional tracking of synchronous wheel speed
        dw_dt = ((1.0 - telem.slip_ratio) / params.wheel_radius) * dv_dt - 2.0 * (omega - target_omega)
    else:
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
