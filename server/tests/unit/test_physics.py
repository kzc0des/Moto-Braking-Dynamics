"""Unit tests for the motorcycle physics engine.

Tests weight transfer, Pacejka Magic Formula, thermodynamics, and ODE integration.
"""

import math
import numpy as np
import pytest

from app.domain.exceptions import PhysicalParameterError, SimulationConfigurationError
from app.domain.physics.models import (
    VehicleParams,
    BrakeAssembly,
    BrakeType,
    EnvironmentParams,
    SurfaceSubstrate,
    SurfaceContaminant,
    PotholeDefect,
    SimulationConfig,
    TerminalOutcome,
)
from app.domain.physics.actuation import ProgressiveSqueezeProfile, SuddenLockupProfile
from app.domain.physics.weight_transfer import (
    compute_normal_loads,
    evaluate_aerodynamic_drag,
    evaluate_pothole_normal_drop,
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
    evaluate_pad_friction,
    evaluate_hydraulic_line_pressure,
    evaluate_brake_torque,
    evaluate_convective_heat_transfer_coefficient,
    evaluate_temperature_derivative,
)
from app.domain.physics.solver import simulate_single_vehicle


def test_vehicle_params_validation():
    """Ensure invalid physical parameters raise PhysicalParameterError."""
    with pytest.raises(PhysicalParameterError):
        VehicleParams(mass=-10.0)

    with pytest.raises(PhysicalParameterError):
        VehicleParams(wheelbase=0.0)

    with pytest.raises(PhysicalParameterError):
        VehicleParams(brake_bias_ratio=1.5)


def test_simulation_config_validation():
    """Ensure invalid simulation configurations raise SimulationConfigurationError."""
    with pytest.raises(SimulationConfigurationError):
        SimulationConfig(initial_velocity=-5.0)

    with pytest.raises(SimulationConfigurationError):
        SimulationConfig(hazard_distance=0.0)

    with pytest.raises(SimulationConfigurationError):
        SimulationConfig(num_telemetry_points=10)


def test_closed_form_weight_transfer_static_balance():
    """Verify that under zero deceleration on flat ground, static weight is conserved."""
    params = VehicleParams(mass=200.0, wheelbase=1.40, cog_distance_front=0.70, cog_distance_rear=0.70)
    env = EnvironmentParams(road_grade_angle=0.0)

    # Zero traction forces (kf = 0, kr = 0, v = 0)
    fz_front, fz_rear = compute_normal_loads(params, env, v=0.0, x=0.0, k_f=0.0, k_r=0.0)

    total_weight = 200.0 * GRAVITY
    assert math.isclose(fz_front, total_weight * 0.5, rel_tol=1e-3)
    assert math.isclose(fz_rear, total_weight * 0.5, rel_tol=1e-3)
    assert math.isclose(fz_front + fz_rear, total_weight, rel_tol=1e-3)


def test_closed_form_weight_transfer_dynamic_shift():
    """Verify dynamic weight transfer shifts normal load forward under front braking."""
    params = VehicleParams(mass=200.0, wheelbase=1.40, cog_distance_front=0.70, cog_distance_rear=0.70, cog_height=0.60)
    env = EnvironmentParams(road_grade_angle=0.0)

    # Front braking with k_f = 0.8, k_r = 0.1
    fz_front, fz_rear = compute_normal_loads(params, env, v=15.0, x=0.0, k_f=0.8, k_r=0.1)

    total_weight = 200.0 * GRAVITY
    assert fz_front > total_weight * 0.5  # Front gets more than 50%
    assert fz_rear < total_weight * 0.5  # Rear gets less than 50%
    assert math.isclose(fz_front + fz_rear, total_weight, rel_tol=1e-3)


def test_pothole_normal_drop_profile():
    """Verify pothole defect produces a C1 smooth normal load reduction only within hole bounds."""
    pothole = PotholeDefect(start_x=10.0, width=1.0, severity=1.0)
    baseline_load = 1000.0

    # Outside pothole (before and after)
    assert evaluate_pothole_normal_drop(pothole, x=9.9, baseline_front_load=baseline_load) == 0.0
    assert evaluate_pothole_normal_drop(pothole, x=11.1, baseline_front_load=baseline_load) == 0.0

    # Edges of pothole (sin(0) = 0, sin(pi) = 0)
    assert math.isclose(evaluate_pothole_normal_drop(pothole, x=10.0, baseline_front_load=baseline_load), 0.0, abs_tol=1e-6)
    assert math.isclose(evaluate_pothole_normal_drop(pothole, x=11.0, baseline_front_load=baseline_load), 0.0, abs_tol=1e-6)

    # Center of pothole (phase = 0.5, sin^2(pi/2) = 1.0)
    center_drop = evaluate_pothole_normal_drop(pothole, x=10.5, baseline_front_load=baseline_load)
    assert math.isclose(center_drop, -1000.0, rel_tol=1e-3)


def test_emergent_slip_ratio_calculation():
    """Verify emergent slip ratio values across rolling, threshold, and lockup states."""
    r_w = 0.30

    # 1. Pure rolling (v = 15 m/s, ω = 50 rad/s -> ω*Rw = 15 m/s)
    slip_roll = evaluate_emergent_slip_ratio(v=15.0, omega=50.0, wheel_radius=r_w)
    assert math.isclose(slip_roll, 0.0, abs_tol=1e-5)

    # 2. Threshold slip (v = 15 m/s, ω = 42.5 rad/s -> ω*Rw = 12.75 m/s)
    slip_thresh = evaluate_emergent_slip_ratio(v=15.0, omega=42.5, wheel_radius=r_w)
    assert math.isclose(slip_thresh, (15.0 - 12.75) / 15.0, rel_tol=1e-3)

    # 3. Full wheel lock (v = 15 m/s, ω = 0)
    slip_lock = evaluate_emergent_slip_ratio(v=15.0, omega=0.0, wheel_radius=r_w)
    assert math.isclose(slip_lock, 1.0, rel_tol=1e-3)

    # 4. Standstill cutoff (v <= 0.05 m/s)
    slip_stop = evaluate_emergent_slip_ratio(v=0.04, omega=0.0, wheel_radius=r_w)
    assert slip_stop == 0.0


def test_pacejka_magic_formula_curve():
    """Verify Pacejka curve achieves peak grip near critical slip and decreases into sliding."""
    coeffs = SUBSTRATE_MATRIX[SurfaceSubstrate.ASPHALT]
    fz = 1500.0
    mu = 0.90

    # Peak grip near kappa_crit (0.15)
    f_crit = pacejka_longitudinal_force(kappa=coeffs.critical_slip, f_z=fz, mu_effective=mu, coeffs=coeffs)
    d_peak = mu * fz
    assert math.isclose(f_crit, d_peak, rel_tol=0.05)

    # Linear elastic zone (kappa = 0.05)
    f_elastic = pacejka_longitudinal_force(kappa=0.05, f_z=fz, mu_effective=mu, coeffs=coeffs)
    assert 0.0 < f_elastic < f_crit

    # Sliding zone at lockup (kappa = 1.0)
    f_locked = pacejka_longitudinal_force(kappa=1.0, f_z=fz, mu_effective=mu, coeffs=coeffs)
    assert f_locked < f_crit  # Sliding friction is lower than peak static friction


def test_friction_ellipse_cornering_constraint():
    """Verify that lateral turning demand reduces remaining longitudinal braking grip."""
    fz = 1500.0
    mu = 0.90
    mass_share = 100.0
    f_x_nominal = 1200.0

    # 1. Straight road (radius = inf)
    fx_straight, fy_straight, deficit = evaluate_cornering_friction_budget(
        f_x_nominal, fz, v=15.0, mass_share=mass_share, curve_radius=float("inf"), mu_effective=mu
    )
    assert fx_straight == f_x_nominal
    assert fy_straight == 0.0
    assert not deficit

    # 2. Moderate curve (radius = 50m)
    fx_curve, fy_curve, deficit = evaluate_cornering_friction_budget(
        f_x_nominal, fz, v=15.0, mass_share=mass_share, curve_radius=50.0, mu_effective=mu
    )
    assert fy_curve > 0.0
    assert fx_curve < f_x_nominal
    assert not deficit

    # 3. Impossible curve overdrawing friction wallet
    fx_washout, fy_washout, deficit = evaluate_cornering_friction_budget(
        f_x_nominal, fz, v=30.0, mass_share=mass_share, curve_radius=10.0, mu_effective=mu
    )
    assert fx_washout == 0.0
    assert deficit


def test_pad_thermal_fade_and_vapor_lock():
    """Verify pad fade degrades friction and vapor lock collapses hydraulic pressure."""
    assembly = BrakeAssembly(
        pad_friction_nominal=0.40,
        fade_temperature=250.0,
        fade_coefficient=0.005,
        fluid_boil_temperature=230.0,
        vapor_transition_band=20.0,
    )

    # Cool state (100°C)
    assert evaluate_pad_friction(assembly, temp=100.0) == 0.40
    assert evaluate_hydraulic_line_pressure(assembly, applied_pressure=5e6, temp=100.0) == 5e6

    # Overheated state (350°C -> 100°C above fade)
    mu_faded = evaluate_pad_friction(assembly, temp=350.0)
    assert mu_faded < 0.40
    assert math.isclose(mu_faded, 0.40 * math.exp(-0.005 * 100.0), rel_tol=1e-3)

    # Vapor lock state (250°C -> fluid boils completely)
    p_boiled = evaluate_hydraulic_line_pressure(assembly, applied_pressure=5e6, temp=255.0)
    assert p_boiled == 0.0

    # Clamping torque collapses to zero when fluid is boiled
    torque_boiled = evaluate_brake_torque(assembly, applied_pressure=5e6, temp=255.0)
    assert torque_boiled == 0.0


def test_simulation_progressive_squeeze_safe_stop():
    """Verify a complete progressive squeeze emergency stop safely halts before hazard."""
    config = SimulationConfig(
        initial_velocity=16.67,  # 60 km/h
        hazard_distance=60.0,
        num_telemetry_points=150,
    )
    result = simulate_single_vehicle(config=config)

    assert result.terminal_outcome == TerminalOutcome.SAFE_STOP
    assert result.stop_distance < 60.0
    assert result.velocity[-1] <= config.standstill_cutoff_velocity
    assert len(result.time) == 150
    assert len(result.velocity) == 150
    assert len(result.slip_ratio) == 150
    assert len(result.normal_load_front) == 150
    assert result.max_temperature >= 25.0


def test_simulation_barrier_collision():
    """Verify that high entry velocity with short hazard distance triggers barrier collision."""
    config = SimulationConfig(
        initial_velocity=35.0,  # 126 km/h
        hazard_distance=15.0,  # Very short distance
    )
    result = simulate_single_vehicle(config=config)

    assert result.terminal_outcome == TerminalOutcome.BARRIER_COLLISION
    assert result.stop_distance >= 15.0
    assert result.impact_velocity is not None
    assert result.impact_velocity > 0.0


def test_simulation_sudden_lockup_washout():
    """Verify sudden lockup panic clamp triggers front-wheel washout."""
    actuation = SuddenLockupProfile(target_pressure=10.0e6)  # 100 bar sudden clamp
    result = simulate_single_vehicle(actuation=actuation)

    # Panic lockup without ABS will exceed critical slip, causing front washout
    assert result.terminal_outcome in (TerminalOutcome.FRONT_WHEEL_WASHOUT, TerminalOutcome.REAR_WHEEL_LIFTOFF)
