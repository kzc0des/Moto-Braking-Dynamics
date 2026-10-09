"""Tire kinematics, Pacejka Magic Formula traction, and Friction Ellipse cornering budget.

Computes emergent slip ratio (κ), normalized traction, and lateral grip constraints.
"""

import math
from dataclasses import dataclass
import numpy as np

from app.domain.physics.models import SurfaceSubstrate, SurfaceContaminant, EnvironmentParams


@dataclass(frozen=True)
class PacejkaCoefficients:
    """Empirical Magic Formula coefficients for roadway substrates."""

    base_friction: float  # μ_base peak adhesion
    stiffness_b: float  # B stiffness factor
    shape_c: float  # C shape factor
    curvature_e: float  # E curvature factor
    critical_slip: float  # κ_crit peak grip slip ratio


SUBSTRATE_MATRIX: dict[SurfaceSubstrate, PacejkaCoefficients] = {
    SurfaceSubstrate.ASPHALT: PacejkaCoefficients(
        base_friction=0.90, stiffness_b=10.0, shape_c=1.65, curvature_e=0.97, critical_slip=0.15
    ),
    SurfaceSubstrate.CONCRETE: PacejkaCoefficients(
        base_friction=0.85, stiffness_b=11.5, shape_c=1.65, curvature_e=0.95, critical_slip=0.13
    ),
    SurfaceSubstrate.LOOSE_GRAVEL: PacejkaCoefficients(
        base_friction=0.45, stiffness_b=5.0, shape_c=1.40, curvature_e=0.50, critical_slip=0.22
    ),
    SurfaceSubstrate.CRATERED_ASPHALT: PacejkaCoefficients(
        base_friction=0.75, stiffness_b=9.0, shape_c=1.60, curvature_e=0.90, critical_slip=0.16
    ),
}

CONTAMINANT_DERATING: dict[SurfaceContaminant, float] = {
    SurfaceContaminant.DRY: 1.00,
    SurfaceContaminant.WET: 0.50,
    SurfaceContaminant.DUSTY: 0.65,
    SurfaceContaminant.PAINTED: 0.35,
}


def get_effective_friction(env: EnvironmentParams) -> float:
    """Calculate effective road friction coefficient: μ_effective = μ_base * η_cond."""
    substrate_coeffs = SUBSTRATE_MATRIX[env.substrate]
    derating = CONTAMINANT_DERATING[env.contaminant]
    return substrate_coeffs.base_friction * derating


def evaluate_emergent_slip_ratio(
    v: float,
    omega: float,
    wheel_radius: float,
    low_speed_epsilon: float = 0.10,
    standstill_cutoff: float = 0.05,
) -> float:
    """Calculate longitudinal slip ratio κ = (v - ω·R_w) / max(v, ε).

    Clamped to [0.0, 1.0] for braking. When v <= standstill_cutoff, returns 0.0.
    """
    if v <= standstill_cutoff:
        return 0.0

    rim_speed = omega * wheel_radius
    denominator = max(v, low_speed_epsilon)
    slip = (v - rim_speed) / denominator

    # Bounded between pure rolling (0.0) and full lockup (1.0)
    return float(np.clip(slip, 0.0, 1.0))


def pacejka_longitudinal_force(
    kappa: float,
    f_z: float,
    mu_effective: float,
    coeffs: PacejkaCoefficients,
) -> float:
    """Evaluate Pacejka Magic Formula longitudinal traction force (Newtons).

    F_x = D * sin[ C * arctan( B*κ - E*(B*κ - arctan(B*κ)) ) ]
    where D = μ_effective * F_z
    """
    if f_z <= 0.0 or kappa <= 0.0:
        return 0.0

    d = mu_effective * f_z
    bx = coeffs.stiffness_b * kappa
    inner_arg = bx - coeffs.curvature_e * (bx - math.atan(bx))
    return float(d * math.sin(coeffs.shape_c * math.atan(inner_arg)))


def evaluate_cornering_friction_budget(
    f_x_nominal: float,
    f_z: float,
    v: float,
    mass_share: float,
    curve_radius: float,
    mu_effective: float,
) -> tuple[float, float, bool]:
    """Apply Friction Ellipse constraint to limit braking force during cornering.

    F_y = mass_share * v² / R
    F_x,max = sqrt(max(0, (μ·F_z)² - F_y²))
    F_x = min(F_x_nominal, F_x,max)

    Returns:
        tuple[float, float, bool]: (clamped_f_x, f_y, lateral_grip_deficit_flag)
    """
    if math.isinf(curve_radius) or curve_radius <= 0.0 or v <= 0.0:
        return f_x_nominal, 0.0, False

    f_y = (mass_share * (v**2)) / curve_radius
    max_total_grip = mu_effective * f_z

    if f_y >= max_total_grip:
        # Lateral cornering demand completely overdraws grip wallet
        return 0.0, f_y, True

    # Remaining grip budget along longitudinal X axis
    remaining_grip_sq = max(0.0, (max_total_grip**2) - (f_y**2))
    f_x_max = math.sqrt(remaining_grip_sq)
    f_x_clamped = min(f_x_nominal, f_x_max)

    return f_x_clamped, f_y, False
