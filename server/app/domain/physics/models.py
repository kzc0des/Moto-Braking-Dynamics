"""Domain dataclasses and enums for motorcycle braking dynamics.

Zero web or serialization framework dependencies; pure Python and NumPy.
"""

from dataclasses import dataclass
from enum import Enum
import numpy as np

from app.domain.exceptions import PhysicalParameterError, SimulationConfigurationError


class TerminalOutcome(str, Enum):
    """Classification of the terminal state reached by the simulation."""

    SAFE_STOP = "safe_stop"
    BARRIER_COLLISION = "barrier_collision"
    FRONT_WHEEL_WASHOUT = "front_wheel_washout"
    REAR_WHEEL_LIFTOFF = "rear_wheel_liftoff"


class BrakeType(str, Enum):
    """Mechanical assembly architecture of the brake mechanism."""

    DISC = "disc"
    DRUM = "drum"


class SurfaceSubstrate(str, Enum):
    """Underlying roadway material determining base Pacejka shape parameters."""

    ASPHALT = "asphalt"
    CONCRETE = "concrete"
    LOOSE_GRAVEL = "loose_gravel"
    CRATERED_ASPHALT = "cratered_asphalt"


class SurfaceContaminant(str, Enum):
    """Surface condition derating nominal friction."""

    DRY = "dry"
    WET = "wet"
    DUSTY = "dusty"
    PAINTED = "painted"


@dataclass(frozen=True)
class VehicleState:
    """Instantaneous state vector of the motorcycle."""

    x: float  # Longitudinal position (m)
    v: float  # Forward velocity (m/s)
    omega: float  # Front wheel angular velocity (rad/s)
    T: float  # Brake rotor / drum temperature (°C)

    def as_array(self) -> np.ndarray:
        return np.array([self.x, self.v, self.omega, self.T], dtype=np.float64)

    @classmethod
    def from_array(cls, arr: np.ndarray | list[float]) -> "VehicleState":
        return cls(x=float(arr[0]), v=float(arr[1]), omega=float(arr[2]), T=float(arr[3]))


@dataclass(frozen=True)
class VehicleParams:
    """Rigid body physical and geometric parameters of the motorcycle and rider."""

    mass: float = 200.0  # Total mass m (kg)
    wheelbase: float = 1.40  # Wheelbase L = a + b (m)
    cog_distance_front: float = 0.70  # CoG to front axle a (m)
    cog_distance_rear: float = 0.70  # CoG to rear axle b (m)
    cog_height: float = 0.60  # CoG height h (m)
    wheel_radius: float = 0.30  # Rolling radius R_w (m)
    wheel_inertia: float = 0.60  # Front wheel rotational moment of inertia I_w (kg·m²)
    drag_coefficient: float = 0.60  # Aerodynamic drag coefficient C_d
    frontal_area: float = 0.70  # Frontal cross-sectional area A (m²)
    brake_bias_ratio: float = 0.30  # Brake bias ratio γ = T_b,rear / T_b,front

    def __post_init__(self) -> None:
        if self.mass <= 0:
            raise PhysicalParameterError(f"Vehicle mass must be positive, got {self.mass}")
        if self.wheelbase <= 0:
            raise PhysicalParameterError(f"Wheelbase must be positive, got {self.wheelbase}")
        if self.wheel_radius <= 0:
            raise PhysicalParameterError(f"Wheel radius must be positive, got {self.wheel_radius}")
        if self.wheel_inertia <= 0:
            raise PhysicalParameterError(f"Wheel inertia must be positive, got {self.wheel_inertia}")
        if not (0.0 <= self.brake_bias_ratio <= 1.0):
            raise PhysicalParameterError(
                f"Brake bias ratio must be in [0.0, 1.0], got {self.brake_bias_ratio}"
            )


@dataclass(frozen=True)
class BrakeAssembly:
    """Mechanical, hydraulic, and thermal parameters of the brake assembly."""

    brake_type: BrakeType = BrakeType.DISC
    rotor_mass: float = 1.50  # Mass of disc rotor or drum hub m_d (kg)
    specific_heat: float = 460.0  # Specific heat capacity c_p (J/(kg·K))
    surface_area: float = 0.05  # Exposed cooling surface area A_surface (m²)
    piston_area: float = 0.0015  # Total caliper piston area A_piston (m²)
    effective_radius: float = 0.13  # Effective pad clamping radius r_eff (m)
    pad_friction_nominal: float = 0.40  # Cool pad friction coefficient μ_pad,0
    fade_temperature: float = 250.0  # Thermal fade onset temperature T_fade (°C)
    fade_coefficient: float = 0.005  # Fade decay rate β_fade (1/°C)
    fluid_boil_temperature: float = 230.0  # Fluid boiling point T_boil (°C)
    vapor_transition_band: float = 20.0  # Boiling transition band ΔT_vapor (°C)
    thermal_efficiency: float = 0.90  # Fraction of friction power into heat η_thermal
    drum_amplification: float = 1.8  # Self-energizing factor K_drum (drum only)

    def __post_init__(self) -> None:
        if self.rotor_mass <= 0:
            raise PhysicalParameterError(f"Rotor mass must be positive, got {self.rotor_mass}")
        if self.specific_heat <= 0:
            raise PhysicalParameterError(f"Specific heat must be positive, got {self.specific_heat}")
        if self.pad_friction_nominal <= 0:
            raise PhysicalParameterError(
                f"Pad friction must be positive, got {self.pad_friction_nominal}"
            )


@dataclass(frozen=True)
class PotholeDefect:
    """Localized road depression producing dynamic normal load drop."""

    start_x: float = 15.0  # Start position of hole (m)
    width: float = 0.8  # Longitudinal hole width w (m)
    severity: float = 1.0  # Depth factor (0.0 to 1.0)

    def __post_init__(self) -> None:
        if self.width <= 0:
            raise PhysicalParameterError(f"Pothole width must be positive, got {self.width}")
        if not (0.0 <= self.severity <= 1.0):
            raise PhysicalParameterError(
                f"Pothole severity must be in [0.0, 1.0], got {self.severity}"
            )


@dataclass(frozen=True)
class EnvironmentParams:
    """Environmental, atmospheric, and roadway properties."""

    substrate: SurfaceSubstrate = SurfaceSubstrate.ASPHALT
    contaminant: SurfaceContaminant = SurfaceContaminant.DRY
    road_grade_angle: float = 0.0  # Longitudinal incline angle θ (rad; >0 uphill, <0 downhill)
    curve_radius: float = float("inf")  # Curve radius R (m; inf for straight road)
    pothole: PotholeDefect | None = None
    ambient_temperature: float = 25.0  # Ambient air temperature T_ambient (°C)
    air_density: float = 1.225  # Ambient air density ρ (kg/m³)

    def __post_init__(self) -> None:
        if self.curve_radius <= 0:
            raise PhysicalParameterError(f"Curve radius must be positive, got {self.curve_radius}")
        if self.air_density <= 0:
            raise PhysicalParameterError(f"Air density must be positive, got {self.air_density}")


@dataclass(frozen=True)
class SimulationConfig:
    """Solver integration execution controls and limits."""

    initial_velocity: float = 16.67  # Initial vehicle forward velocity v_0 (m/s; 60 km/h)
    initial_rotor_temp: float = 25.0  # Initial rotor temperature T_0 (°C)
    hazard_distance: float = 50.0  # Hazard barrier distance X_hazard (m)
    max_simulation_time: float = 10.0  # Integrator maximum time ceiling (s)
    num_telemetry_points: int = 150  # Uniform columnar output array length
    standstill_cutoff_velocity: float = 0.05  # v_stop standstill threshold (m/s)
    low_speed_epsilon: float = 0.10  # Regularization floor for slip ratio denominator (m/s)

    def __post_init__(self) -> None:
        if self.initial_velocity <= 0:
            raise SimulationConfigurationError(
                f"Initial velocity must be positive, got {self.initial_velocity}"
            )
        if self.hazard_distance <= 0:
            raise SimulationConfigurationError(
                f"Hazard distance must be positive, got {self.hazard_distance}"
            )
        if self.max_simulation_time <= 0:
            raise SimulationConfigurationError(
                f"Max simulation time must be positive, got {self.max_simulation_time}"
            )
        if not (50 <= self.num_telemetry_points <= 500):
            raise SimulationConfigurationError(
                f"Telemetry points must be between 50 and 500, got {self.num_telemetry_points}"
            )


@dataclass(frozen=True)
class SimulationResult:
    """Columnar telemetry and terminal summary produced by the ODE solver."""

    # Trajectory arrays (length = num_telemetry_points)
    time: np.ndarray
    position: np.ndarray
    velocity: np.ndarray
    wheel_angular_velocity: np.ndarray
    temperature: np.ndarray
    slip_ratio: np.ndarray
    normal_load_front: np.ndarray
    normal_load_rear: np.ndarray
    friction_force_front: np.ndarray
    friction_force_rear: np.ndarray
    brake_torque: np.ndarray

    # Terminal summary metadata
    terminal_outcome: TerminalOutcome
    stop_distance: float
    stop_time: float
    impact_velocity: float | None
    peak_deceleration: float
    max_temperature: float
