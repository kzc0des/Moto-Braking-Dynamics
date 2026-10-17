"""Pydantic transport schemas for motorcycle braking simulation API.

Mirrors TypeScript models with camelCase JSON aliases and physical boundary validation.
"""

from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


class CamelBaseModel(BaseModel):
    """Base model enforcing camelCase serialization for Angular JSON contract."""

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class VehicleParamsSchema(CamelBaseModel):
    """Physical rigid-body dimensions and parameters."""

    mass: float = Field(..., gt=20.0, le=1000.0, description="Total mass in kg")
    wheelbase: float = Field(..., ge=0.8, le=2.5, description="Wheelbase in meters")
    cog_distance_front: float = Field(..., gt=0.05, le=2.2, description="CoG to front axle distance (m)")
    cog_distance_rear: float = Field(..., gt=0.05, le=2.2, description="CoG to rear axle distance (m)")
    cog_height: float = Field(..., ge=0.15, le=1.8, description="Center of gravity height (m)")
    wheel_radius: float = Field(default=0.30, ge=0.10, le=0.60, description="Rolling radius (m)")
    wheel_inertia: float = Field(default=0.60, ge=0.05, le=5.0, description="Wheel inertia (kg·m²)")
    drag_coefficient: float = Field(default=0.60, ge=0.1, le=2.0, description="Aerodynamic drag coefficient C_d")
    frontal_area: float = Field(default=0.70, ge=0.1, le=3.0, description="Frontal area (m²)")
    brake_bias_ratio: float = Field(default=0.30, ge=0.0, le=1.0, description="Brake bias ratio [0.0, 1.0]")
    front_tire_pressure_psi: float = Field(default=29.0, ge=10.0, le=70.0, description="Front tire pressure in PSI")
    rear_tire_pressure_psi: float = Field(default=33.0, ge=10.0, le=70.0, description="Rear tire pressure in PSI")

    @model_validator(mode="after")
    def validate_cog_envelope(self) -> "VehicleParamsSchema":
        if self.cog_height > self.wheelbase * 1.5:
            raise ValueError(f"CoG height ({self.cog_height}m) cannot exceed 1.5x wheelbase ({self.wheelbase}m)")
        axle_sum = self.cog_distance_front + self.cog_distance_rear
        if abs(axle_sum - self.wheelbase) > 0.15 * self.wheelbase:
            raise ValueError(
                f"Sum of CoG axle distances (a+b = {axle_sum:.2f}m) diverges from wheelbase ({self.wheelbase:.2f}m)"
            )
        return self


class BrakeAssemblySchema(CamelBaseModel):
    """Brake hardware and thermal dissipation properties."""

    brake_type: Literal["disc", "drum"] = Field(default="disc")
    rotor_mass: float = Field(default=1.50, ge=0.20, le=10.0, description="Rotor/drum mass in kg")
    specific_heat: float = Field(default=460.0, ge=100.0, le=2000.0, description="Specific heat J/(kg·K)")
    surface_area: float = Field(default=0.045, ge=0.005, le=0.50, description="Convective cooling area m²")
    piston_area: float = Field(default=0.00125, ge=0.0001, le=0.01, description="Caliper piston area m²")
    effective_radius: float = Field(default=0.140, ge=0.04, le=0.30, description="Effective clamping radius (m)")
    pad_friction_nominal: float = Field(default=0.40, ge=0.10, le=0.90, description="Nominal pad friction coefficient")
    fade_temperature: float = Field(default=250.0, ge=100.0, le=500.0, description="Thermal fade onset (°C)")
    fade_coefficient: float = Field(default=0.0035, ge=0.0001, le=0.05, description="Fade decay exponent")
    fluid_boil_temperature: float = Field(default=260.0, ge=100.0, le=400.0, description="Fluid boiling temp (°C)")
    vapor_transition_band: float = Field(default=40.0, ge=5.0, le=100.0, description="Boiling transition band (°C)")
    thermal_efficiency: float = Field(default=0.88, ge=0.1, le=1.0)
    drum_amplification: float = Field(default=1.50, ge=1.0, le=3.0)


class PotholeDefectSchema(CamelBaseModel):
    """Localized geometric road defect."""

    start_x: float = Field(default=15.0, ge=0.0, description="Longitudinal distance to pothole (m)")
    width: float = Field(default=0.40, ge=0.05, le=5.0, description="Pothole void width (m)")
    severity: float = Field(default=0.60, ge=0.0, le=1.0, description="Normal load reduction severity [0, 1]")


class EnvironmentParamsSchema(CamelBaseModel):
    """Track roadway and ambient conditions."""

    substrate: Literal["asphalt", "concrete", "gravel", "cratered_asphalt"] = Field(default="asphalt")
    contaminant: Literal["dry", "wet", "dusty", "painted"] = Field(default="dry")
    road_grade_angle: float = Field(default=0.0, ge=-0.50, le=0.50, description="Incline angle in radians")
    curve_radius: float | None = Field(default=None, description="Curve radius in meters (None for straight road)")
    pothole_enabled: bool = Field(default=False)
    pothole: PotholeDefectSchema | None = Field(default=None)
    ambient_temperature: float = Field(default=25.0, ge=-20.0, le=60.0, description="Ambient air temp (°C)")
    air_density: float = Field(default=1.225, ge=0.5, le=2.0, description="Air density (kg/m³)")


class ActuationParamsSchema(CamelBaseModel):
    """Braking inputs and biomechanical rider control."""

    type: Literal["progressive_squeeze", "sudden_lockup", "biomechanical"] = Field(default="biomechanical")
    target_pressure: float = Field(default=2.5e6, gt=0.0, le=20.0e6, description="Peak hydraulic line pressure (Pa)")
    rise_time: float = Field(default=0.35, gt=0.0, le=5.0, description="Rise time ramp duration (s)")
    front_lever_pct: float | None = Field(default=85.0, ge=0.0, le=100.0, description="Right Hand Lever pull %")
    rear_control_pct: float | None = Field(default=65.0, ge=0.0, le=100.0, description="Rear control input %")
    t_reaction: float | None = Field(default=1.0, ge=0.0, le=5.0, description="Reaction latency (s)")


class SimulationConfigSchema(CamelBaseModel):
    """ODE solver time horizon and boundary parameters."""

    initial_velocity: float = Field(default=16.67, ge=1.0, le=100.0, description="Entry velocity (m/s)")
    initial_rotor_temp: float = Field(default=25.0, ge=-20.0, le=300.0, description="Initial rotor temp (°C)")
    hazard_distance: float = Field(default=50.0, ge=5.0, le=500.0, description="Hazard obstacle distance (m)")
    max_simulation_time: float = Field(default=10.0, ge=1.0, le=60.0, description="Max integration ceiling (s)")
    num_telemetry_points: int = Field(default=150, ge=50, le=500, description="Columnar decimation resolution")
    standstill_cutoff_velocity: float = Field(default=0.05, ge=0.01, le=1.0, description="Standstill halt cutoff (m/s)")
    low_speed_epsilon: float = Field(default=0.10, ge=0.01, le=1.0, description="Slip singularity epsilon (m/s)")


class BenchmarkInstanceConfigSchema(CamelBaseModel):
    """User-configured motorcycle evaluation instance."""

    id: str = Field(default="instance-1")
    name: str = Field(default="Custom Motorcycle")
    enabled: bool = Field(default=True)
    color_accent: str = Field(default="#4ade80")
    sprite_key: str | None = Field(default=None)
    vehicle: VehicleParamsSchema
    brake: BrakeAssemblySchema | None = Field(default=None)
    front_brake: BrakeAssemblySchema | None = Field(default=None)
    rear_brake: BrakeAssemblySchema | None = Field(default=None)
    abs_configuration: Literal["none", "single_channel_front", "dual_channel"] = Field(default="none")
    actuation: ActuationParamsSchema
    environment: EnvironmentParamsSchema
    simulation: SimulationConfigSchema

    @model_validator(mode="after")
    def validate_abs_hardware(self) -> "BenchmarkInstanceConfigSchema":
        if not self.brake and not self.front_brake:
            raise ValueError("Either 'brake' or 'front_brake' configuration must be provided.")
        if self.abs_configuration == "dual_channel":
            rear = self.rear_brake or self.brake
            if rear and rear.brake_type == "drum":
                raise ValueError(
                    "Dual-Channel ABS requires hydraulic disc brake on rear assembly (cannot pulse mechanical drum)."
                )
        return self


class BenchmarkApiPayload(CamelBaseModel):
    """Stateless benchmark request containing custom vehicle configurations."""

    instances: list[BenchmarkInstanceConfigSchema] = Field(..., min_length=1)


class TelemetrySeriesSchema(CamelBaseModel):
    """Uniformly decimated columnar telemetry trajectory arrays."""

    time: list[float]
    distance: list[float]
    velocity: list[float]
    deceleration: list[float]
    omega: list[float]
    slip_ratio_front: list[float]
    slip_ratio_rear: list[float]
    normal_load_front: list[float]
    normal_load_rear: list[float]
    rotor_temperature: list[float]
    abs_active_front: list[bool] = Field(default_factory=list)
    abs_active_rear: list[bool] = Field(default_factory=list)


class InstanceSimulationResultSchema(CamelBaseModel):
    """Comprehensive performance summary and columnar telemetry for one vehicle."""

    instance_id: str
    terminal_outcome: Literal["Safe Stop", "Barrier Collision", "Front-Wheel Washout", "Rear-Wheel Lift-off"]
    stopping_distance: float
    stopping_time: float
    peak_deceleration: float
    final_velocity: float
    max_rotor_temp: float
    reaction_distance: float | None = None
    mechanical_braking_distance: float | None = None
    peak_front_lever_pct: float | None = None
    peak_rear_control_pct: float | None = None
    peak_front_pressure_mpa: float | None = None
    peak_rear_pressure_mpa: float | None = None
    rear_lift_off_occurred: bool
    front_washout_occurred: bool
    fluid_boil_occurred: bool
    rear_lockup_occurred: bool = False
    abs_intervened: bool = False
    telemetry: TelemetrySeriesSchema


class BenchmarkResponseSchema(CamelBaseModel):
    """Stateless benchmark evaluation response."""

    solver_execution_time_ms: float
    instances: list[InstanceSimulationResultSchema]
    warnings: list[str] = Field(default_factory=list)
