"""Brake thermodynamics, pad friction fade, hydraulic vapor lock, and torque generation.

Supports exposed hydraulic disc assemblies and enclosed drum assemblies (ADR 0002).
"""

import math

from app.domain.physics.models import BrakeAssembly, BrakeType


def evaluate_pad_friction(assembly: BrakeAssembly, temp: float) -> float:
    """Calculate effective pad friction coefficient degraded by thermal fade.

    μ_pad(T) = μ_pad,0 * exp[ -β_fade * max(0, T - T_fade) ]
    """
    overheat = max(0.0, temp - assembly.fade_temperature)
    if overheat <= 0.0:
        return assembly.pad_friction_nominal
    return assembly.pad_friction_nominal * math.exp(-assembly.fade_coefficient * overheat)


def evaluate_hydraulic_line_pressure(
    assembly: BrakeAssembly,
    applied_pressure: float,
    temp: float,
) -> float:
    """Calculate effective hydraulic line pressure degraded by fluid boiling vapor lock.

    P_line(T) = P_applied * max(0, 1 - max(0, T - T_boil) / ΔT_vapor)
    """
    if applied_pressure <= 0.0:
        return 0.0

    boil_over = max(0.0, temp - assembly.fluid_boil_temperature)
    if boil_over <= 0.0:
        return applied_pressure

    pressure_fraction = max(0.0, 1.0 - (boil_over / assembly.vapor_transition_band))
    return applied_pressure * pressure_fraction


def evaluate_brake_torque(
    assembly: BrakeAssembly,
    applied_pressure: float,
    temp: float,
) -> float:
    """Calculate instantaneous retarding torque T_b generated at the wheel.

    Disc: T_b = 2 * μ_pad(T) * P_line(T) * A_piston * r_eff
    Drum: T_b = K_drum * μ_pad(T) * P_line(T) * A_piston * r_eff
    """
    mu_pad = evaluate_pad_friction(assembly, temp)
    p_line = evaluate_hydraulic_line_pressure(assembly, applied_pressure, temp)

    if assembly.brake_type == BrakeType.DISC:
        # Multiplier of 2 represents two pads clamping opposing faces of the rotor
        torque = 2.0 * mu_pad * p_line * assembly.piston_area * assembly.effective_radius
    else:
        # Drum brake self-energizing geometric amplification
        torque = (
            assembly.drum_amplification
            * mu_pad
            * p_line
            * assembly.piston_area
            * assembly.effective_radius
        )

    return max(0.0, torque)


def evaluate_convective_heat_transfer_coefficient(
    assembly: BrakeAssembly,
    velocity: float,
) -> float:
    """Calculate convective cooling coefficient h_conv(v) in W/(m²·K).

    Disc: h_conv,disc = 20.0 + 0.15 * v^0.8
    Drum: h_conv,drum = 0.20 * h_conv,disc (enclosed trapped air)
    """
    v = max(0.0, velocity)
    h_disc = 20.0 + 0.15 * (v**0.8)

    if assembly.brake_type == BrakeType.DISC:
        return h_disc
    return 0.20 * h_disc


def evaluate_temperature_derivative(
    assembly: BrakeAssembly,
    torque: float,
    omega: float,
    temp: float,
    velocity: float,
    ambient_temp: float,
) -> float:
    """Calculate rate of rotor temperature change dT/dt in °C/s.

    dT/dt = (Q_gen - Q_conv) / (m_d * c_p)
    where Q_gen = η_thermal * T_b * ω
          Q_conv = h_conv(v) * A_surface * (T - T_ambient)
    """
    # Mechanical friction power converted to thermal heat
    q_gen = assembly.thermal_efficiency * torque * max(0.0, omega)

    # Convective heat dissipation to passing ambient air
    h_conv = evaluate_convective_heat_transfer_coefficient(assembly, velocity)
    q_conv = h_conv * assembly.surface_area * (temp - ambient_temp)

    thermal_mass = assembly.rotor_mass * assembly.specific_heat
    return (q_gen - q_conv) / thermal_mass
