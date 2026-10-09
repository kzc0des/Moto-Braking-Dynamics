"""Physics domain module for motorcycle braking dynamics.

Pure Python and NumPy domain implementation of two-wheeled vehicle braking,
weight transfer, Pacejka Magic Formula, and thermodynamics.
"""

from app.domain.physics.models import (
    TerminalOutcome,
    BrakeType,
    SurfaceSubstrate,
    SurfaceContaminant,
    VehicleState,
    VehicleParams,
    BrakeAssembly,
    PotholeDefect,
    EnvironmentParams,
    SimulationConfig,
    SimulationResult,
)
from app.domain.physics.actuation import (
    BrakeActuationProfile,
    ProgressiveSqueezeProfile,
    SuddenLockupProfile,
)
from app.domain.physics.weight_transfer import compute_normal_loads, evaluate_aerodynamic_drag
from app.domain.physics.tire import (
    SUBSTRATE_MATRIX,
    CONTAMINANT_DERATING,
    get_effective_friction,
    evaluate_emergent_slip_ratio,
    pacejka_longitudinal_force,
    evaluate_cornering_friction_budget,
)
from app.domain.physics.brake import (
    evaluate_pad_friction,
    evaluate_hydraulic_line_pressure,
    evaluate_brake_torque,
    evaluate_temperature_derivative,
)
from app.domain.physics.derivatives import (
    evaluate_system_derivatives,
    compute_instantaneous_telemetry,
    InstantaneousTelemetry,
)
from app.domain.physics.solver import simulate_single_vehicle

__all__ = [
    "TerminalOutcome",
    "BrakeType",
    "SurfaceSubstrate",
    "SurfaceContaminant",
    "VehicleState",
    "VehicleParams",
    "BrakeAssembly",
    "PotholeDefect",
    "EnvironmentParams",
    "SimulationConfig",
    "SimulationResult",
    "BrakeActuationProfile",
    "ProgressiveSqueezeProfile",
    "SuddenLockupProfile",
    "compute_normal_loads",
    "evaluate_aerodynamic_drag",
    "SUBSTRATE_MATRIX",
    "CONTAMINANT_DERATING",
    "get_effective_friction",
    "evaluate_emergent_slip_ratio",
    "pacejka_longitudinal_force",
    "evaluate_cornering_friction_budget",
    "evaluate_pad_friction",
    "evaluate_hydraulic_line_pressure",
    "evaluate_brake_torque",
    "evaluate_temperature_derivative",
    "evaluate_system_derivatives",
    "compute_instantaneous_telemetry",
    "InstantaneousTelemetry",
    "simulate_single_vehicle",
]
