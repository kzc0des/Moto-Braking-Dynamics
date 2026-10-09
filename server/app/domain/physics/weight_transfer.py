"""Closed-form dynamic normal load transfer and road disturbance solver.

Resolves the algebraic loop between deceleration, longitudinal tire forces,
and normal loads analytically without iterative root-finding (ADR 0001).
"""

import math
import numpy as np

from app.domain.physics.models import VehicleParams, EnvironmentParams, PotholeDefect

GRAVITY = 9.81  # Standard gravitational acceleration g (m/s²)


def evaluate_aerodynamic_drag(params: VehicleParams, env: EnvironmentParams, v: float) -> float:
    """Calculate aerodynamic drag force opposing motion.

    F_drag = 0.5 * rho * C_d * A * v²
    """
    if v <= 0.0:
        return 0.0
    return 0.5 * env.air_density * params.drag_coefficient * params.frontal_area * (v**2)


def evaluate_pothole_normal_drop(
    pothole: PotholeDefect | None,
    x: float,
    baseline_front_load: float,
) -> float:
    """Evaluate C¹ smooth normal force reduction over a pothole void.

    Uses a sine-squared window over [x_start, x_start + width] to preserve
    continuous first derivatives for the adaptive Runge-Kutta integrator (ADR 0005).
    """
    if pothole is None:
        return 0.0

    x0 = pothole.start_x
    w = pothole.width
    if x0 <= x <= (x0 + w):
        phase = (x - x0) / w
        return -pothole.severity * baseline_front_load * (math.sin(math.pi * phase) ** 2)

    return 0.0


def compute_normal_loads(
    params: VehicleParams,
    env: EnvironmentParams,
    v: float,
    x: float,
    k_f: float,
    k_r: float,
) -> tuple[float, float]:
    """Calculate dynamic normal loads on the front and rear tires (in Newtons).

    Solves the pitch-moment equilibrium analytically:
    F_z,front = [m·g·cos(θ)·(b/L) + (k_r·m·g·cos(θ) + F_drag + m·g·sin(θ))·(h/L) + ΔF_z,defect]
                / [1 - (k_f - k_r)·(h/L)]

    F_z,rear = m·g·cos(θ) - F_z,front

    Returns:
        tuple[float, float]: (F_z_front, F_z_rear) clamped to non-negative values.
    """
    m = params.mass
    g = GRAVITY
    theta = env.road_grade_angle
    L = params.wheelbase
    b = params.cog_distance_rear
    h = params.cog_height

    cos_theta = math.cos(theta)
    sin_theta = math.sin(theta)

    # Static baseline vertical force
    total_static_weight = m * g * cos_theta
    static_front_load = total_static_weight * (b / L)

    # Aerodynamic drag opposing vehicle
    f_drag = evaluate_aerodynamic_drag(params, env, v)

    # Pothole dynamic load disruption
    delta_fz_defect = evaluate_pothole_normal_drop(env.pothole, x, static_front_load)

    # Numerator of closed-form solution
    h_over_l = h / L
    dynamic_rear_moment = (k_r * total_static_weight + f_drag + m * g * sin_theta) * h_over_l
    numerator = static_front_load + dynamic_rear_moment + delta_fz_defect

    # Denominator with numerical singularity protection
    coupling_factor = (k_f - k_r) * h_over_l
    denominator = 1.0 - coupling_factor

    # Floor denominator to prevent divide-by-zero or unphysical sign flip near pitch-over
    eps_denominator = 1e-3
    safe_denominator = max(eps_denominator, denominator)

    f_z_front_raw = numerator / safe_denominator
    f_z_front = max(0.0, f_z_front_raw)

    # Conservation of vertical normal force on the roadway
    f_z_rear_raw = total_static_weight - f_z_front
    f_z_rear = max(0.0, f_z_rear_raw)

    return f_z_front, f_z_rear
