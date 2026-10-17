"""Application service translating web transport schemas to physical domain models.

Orchestrates SciPy RK45 ODE integration runs per vehicle instance and decimates
telemetry trajectories into columnar arrays.
"""

import time
import math
import numpy as np

from app.api.schemas.simulation import (
    BenchmarkApiPayload,
    BenchmarkResponseSchema,
    BenchmarkInstanceConfigSchema,
    InstanceSimulationResultSchema,
    TelemetrySeriesSchema,
)
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
    AbsConfiguration,
)
from app.domain.physics.actuation import (
    ProgressiveSqueezeProfile,
    SuddenLockupProfile,
    BiomechanicalDualBrakeProfile,
)
from app.domain.physics.solver import simulate_single_vehicle


TERMINAL_OUTCOME_MAP: dict[TerminalOutcome, str] = {
    TerminalOutcome.SAFE_STOP: "Safe Stop",
    TerminalOutcome.BARRIER_COLLISION: "Barrier Collision",
    TerminalOutcome.FRONT_WHEEL_WASHOUT: "Front-Wheel Washout",
    TerminalOutcome.REAR_WHEEL_LIFTOFF: "Rear-Wheel Lift-off",
}

SUBSTRATE_MAP: dict[str, SurfaceSubstrate] = {
    "asphalt": SurfaceSubstrate.ASPHALT,
    "concrete": SurfaceSubstrate.CONCRETE,
    "gravel": SurfaceSubstrate.LOOSE_GRAVEL,
    "cratered_asphalt": SurfaceSubstrate.CRATERED_ASPHALT,
}

CONTAMINANT_MAP: dict[str, SurfaceContaminant] = {
    "dry": SurfaceContaminant.DRY,
    "wet": SurfaceContaminant.WET,
    "dusty": SurfaceContaminant.DUSTY,
    "painted": SurfaceContaminant.PAINTED,
}


class SimulationService:
    """Coordinates simulation runs for stateless benchmark requests."""

    def run_benchmark(self, payload: BenchmarkApiPayload) -> BenchmarkResponseSchema:
        """Execute independent solver runs for each submitted vehicle instance."""
        start_time = time.perf_counter()
        results: list[InstanceSimulationResultSchema] = []
        warnings: list[str] = []

        for inst in payload.instances:
            if not inst.enabled:
                continue

            try:
                result_schema = self._solve_instance(inst)
                results.append(result_schema)
            except Exception as exc:
                warnings.append(f"Instance '{inst.name}' ({inst.id}) simulation warning: {str(exc)}")

        elapsed_ms = (time.perf_counter() - start_time) * 1000.0

        return BenchmarkResponseSchema(
            solver_execution_time_ms=round(elapsed_ms, 2),
            instances=results,
            warnings=warnings,
        )

    def _solve_instance(self, config: BenchmarkInstanceConfigSchema) -> InstanceSimulationResultSchema:
        """Map Pydantic schema to domain models and execute single ODE run."""
        # 1. Map VehicleParams with independent tire inflation pressures (ADR 0028)
        v = config.vehicle
        params = VehicleParams(
            mass=v.mass,
            wheelbase=v.wheelbase,
            cog_distance_front=v.cog_distance_front,
            cog_distance_rear=v.cog_distance_rear,
            cog_height=v.cog_height,
            wheel_radius=v.wheel_radius,
            wheel_inertia=v.wheel_inertia,
            drag_coefficient=v.drag_coefficient,
            frontal_area=v.frontal_area,
            brake_bias_ratio=v.brake_bias_ratio,
            front_tire_pressure_psi=v.front_tire_pressure_psi,
            rear_tire_pressure_psi=v.rear_tire_pressure_psi,
        )

        # 2. Map Decoupled Brake Assemblies (ADR 0027, ADR 0029)
        fb_schema = config.front_brake or config.brake
        front_brake = BrakeAssembly(
            brake_type=BrakeType.DISC if fb_schema.brake_type == "disc" else BrakeType.DRUM,
            rotor_mass=fb_schema.rotor_mass,
            specific_heat=fb_schema.specific_heat,
            surface_area=fb_schema.surface_area,
            piston_area=fb_schema.piston_area,
            effective_radius=fb_schema.effective_radius,
            pad_friction_nominal=fb_schema.pad_friction_nominal,
            fade_temperature=fb_schema.fade_temperature,
            fade_coefficient=fb_schema.fade_coefficient,
            fluid_boil_temperature=fb_schema.fluid_boil_temperature,
            vapor_transition_band=fb_schema.vapor_transition_band,
            thermal_efficiency=fb_schema.thermal_efficiency,
            drum_amplification=fb_schema.drum_amplification,
        )

        if config.rear_brake:
            rb_schema = config.rear_brake
            rear_brake = BrakeAssembly(
                brake_type=BrakeType.DISC if rb_schema.brake_type == "disc" else BrakeType.DRUM,
                rotor_mass=rb_schema.rotor_mass,
                specific_heat=rb_schema.specific_heat,
                surface_area=rb_schema.surface_area,
                piston_area=rb_schema.piston_area,
                effective_radius=rb_schema.effective_radius,
                pad_friction_nominal=rb_schema.pad_friction_nominal,
                fade_temperature=rb_schema.fade_temperature,
                fade_coefficient=rb_schema.fade_coefficient,
                fluid_boil_temperature=rb_schema.fluid_boil_temperature,
                vapor_transition_band=rb_schema.vapor_transition_band,
                thermal_efficiency=rb_schema.thermal_efficiency,
                drum_amplification=rb_schema.drum_amplification,
            )
        else:
            b = config.brake
            rear_brake = BrakeAssembly(
                brake_type=BrakeType.DRUM if b.brake_type == "drum" else BrakeType.DISC,
                rotor_mass=b.rotor_mass * 0.8,
                specific_heat=b.specific_heat,
                surface_area=b.surface_area * 0.8,
                piston_area=b.piston_area * 0.8,
                effective_radius=b.effective_radius * 0.85,
                pad_friction_nominal=b.pad_friction_nominal,
                fade_temperature=b.fade_temperature,
                fade_coefficient=b.fade_coefficient,
                fluid_boil_temperature=b.fluid_boil_temperature,
                vapor_transition_band=b.vapor_transition_band,
                thermal_efficiency=b.thermal_efficiency,
                drum_amplification=b.drum_amplification,
            )

        # 3. Map EnvironmentParams
        e = config.environment
        pothole = None
        if e.pothole_enabled and e.pothole:
            pothole = PotholeDefect(
                start_x=e.pothole.start_x,
                width=e.pothole.width,
                severity=e.pothole.severity,
            )

        curve_r = (
            float("inf")
            if (e.curve_radius is None or e.curve_radius <= 0.0 or math.isinf(e.curve_radius))
            else float(e.curve_radius)
        )

        env = EnvironmentParams(
            substrate=SUBSTRATE_MAP.get(e.substrate, SurfaceSubstrate.ASPHALT),
            contaminant=CONTAMINANT_MAP.get(e.contaminant, SurfaceContaminant.DRY),
            road_grade_angle=e.road_grade_angle,
            curve_radius=curve_r,
            pothole=pothole,
            ambient_temperature=e.ambient_temperature,
            air_density=e.air_density,
        )

        # 4. Map ActuationProfile
        act = config.actuation
        t_rxn = act.t_reaction if act.t_reaction is not None else 1.0
        front_lever_pct = act.front_lever_pct if act.front_lever_pct is not None else 85.0
        rear_control_pct = act.rear_control_pct if act.rear_control_pct is not None else 65.0

        if act.type == "sudden_lockup":
            actuation_profile = SuddenLockupProfile(target_pressure=act.target_pressure)
            t_rxn = 0.0
        elif act.type == "progressive_squeeze":
            actuation_profile = ProgressiveSqueezeProfile(
                target_pressure=act.target_pressure,
                rise_time=act.rise_time,
            )
            t_rxn = 0.0
        else:
            actuation_profile = BiomechanicalDualBrakeProfile(
                front_lever_pct=front_lever_pct,
                rear_control_pct=rear_control_pct,
                t_reaction=t_rxn,
                rise_time_front=act.rise_time,
                rise_time_rear=max(0.15, act.rise_time * 0.7),
            )

        # 5. Map SimulationConfig
        s = config.simulation
        sim_config = SimulationConfig(
            initial_velocity=s.initial_velocity,
            initial_rotor_temp=s.initial_rotor_temp,
            hazard_distance=s.hazard_distance,
            max_simulation_time=s.max_simulation_time,
            num_telemetry_points=s.num_telemetry_points,
            standstill_cutoff_velocity=s.standstill_cutoff_velocity,
            low_speed_epsilon=s.low_speed_epsilon,
        )

        # 6. Map ABS Configuration (ADR 0027)
        abs_map = {
            "none": AbsConfiguration.NONE,
            "single_channel_front": AbsConfiguration.SINGLE_CHANNEL_FRONT,
            "dual_channel": AbsConfiguration.DUAL_CHANNEL,
        }
        abs_config = abs_map.get(config.abs_configuration, AbsConfiguration.NONE)

        # 7. Execute Runge-Kutta 4th/5th Order Integration
        domain_res = simulate_single_vehicle(
            params=params,
            brake_assembly=front_brake,
            env=env,
            actuation=actuation_profile,
            config=sim_config,
            rear_brake_assembly=rear_brake,
            abs_configuration=abs_config,
        )

        # 7. Decimated Columnar Telemetry
        num_points = len(domain_res.time)
        decel_array = (domain_res.friction_force_front + domain_res.friction_force_rear) / params.mass

        # Synthesize rear slip ratio trajectory from rear brake force demand vs normal load
        slip_rear = np.zeros(num_points, dtype=np.float64)
        for i in range(num_points):
            ti = domain_res.time[i]
            if ti <= t_rxn:
                slip_rear[i] = 0.01
            else:
                norm_rear = max(1.0, domain_res.normal_load_rear[i])
                ratio = domain_res.friction_force_rear[i] / norm_rear
                if rear_control_pct > 80.0 and ratio > 0.40:
                    slip_rear[i] = min(0.95, 0.15 + (rear_control_pct / 100.0) * 0.60)
                else:
                    slip_rear[i] = min(0.20, max(0.01, ratio * 0.18))

        telem_schema = TelemetrySeriesSchema(
            time=[float(x) for x in domain_res.time],
            distance=[float(x) for x in domain_res.position],
            velocity=[float(x) for x in domain_res.velocity],
            deceleration=[float(x) for x in decel_array],
            omega=[float(x) for x in domain_res.wheel_angular_velocity],
            slip_ratio_front=[float(x) for x in domain_res.slip_ratio],
            slip_ratio_rear=[float(x) for x in slip_rear],
            normal_load_front=[float(x) for x in domain_res.normal_load_front],
            normal_load_rear=[float(x) for x in domain_res.normal_load_rear],
            rotor_temperature=[float(x) for x in domain_res.temperature],
            abs_active_front=[bool(x) for x in domain_res.abs_active_front],
            abs_active_rear=[bool(x) for x in domain_res.abs_active_rear],
        )

        # Two-phase distance breakdown
        v0 = sim_config.initial_velocity
        d_rxn = round(v0 * t_rxn, 2)
        d_total = round(domain_res.stop_distance, 2)
        final_vel = domain_res.impact_velocity if domain_res.impact_velocity is not None else 0.0

        if domain_res.terminal_outcome == TerminalOutcome.BARRIER_COLLISION:
            # Unconstrained mechanical braking distance required to achieve zero velocity
            delta_x_available = max(0.0, sim_config.hazard_distance - d_rxn)
            if delta_x_available > 0.0 and v0 > final_vel:
                a_eff = (v0**2 - final_vel**2) / (2.0 * delta_x_available)
                d_brake = round(v0**2 / (2.0 * max(0.5, a_eff)), 2)
            else:
                a_eff = domain_res.peak_deceleration if domain_res.peak_deceleration > 0.5 else 5.88
                d_brake = round(v0**2 / (2.0 * a_eff), 2)
        else:
            d_brake = round(max(0.0, d_total - d_rxn), 2)

        peak_front_mpa = round((front_lever_pct / 100.0) * 3.5, 2)
        peak_rear_mpa = round((rear_control_pct / 100.0) * 2.5, 2)

        client_outcome = TERMINAL_OUTCOME_MAP[domain_res.terminal_outcome]

        rear_lift = bool(np.any(domain_res.normal_load_rear <= 0.01))
        front_washout = bool(domain_res.terminal_outcome == TerminalOutcome.FRONT_WHEEL_WASHOUT)
        # ADR 0029: Only hydraulic disc brakes can suffer fluid boiling vapor lock
        fluid_boil = bool(
            front_brake.brake_type == BrakeType.DISC
            and domain_res.max_temperature >= front_brake.fluid_boil_temperature
        )

        return InstanceSimulationResultSchema(
            instance_id=config.id,
            terminal_outcome=client_outcome,  # type: ignore[arg-type]
            stopping_distance=d_total,
            stopping_time=round(domain_res.stop_time, 2),
            peak_deceleration=round(domain_res.peak_deceleration, 2),
            final_velocity=round(final_vel, 2),
            max_rotor_temp=round(domain_res.max_temperature, 1),
            reaction_distance=d_rxn,
            mechanical_braking_distance=d_brake,
            peak_front_lever_pct=front_lever_pct,
            peak_rear_control_pct=rear_control_pct,
            peak_front_pressure_mpa=peak_front_mpa,
            peak_rear_pressure_mpa=peak_rear_mpa,
            rear_lift_off_occurred=rear_lift,
            front_washout_occurred=front_washout,
            fluid_boil_occurred=fluid_boil,
            rear_lockup_occurred=bool(domain_res.rear_lockup_occurred),
            abs_intervened=bool(domain_res.abs_intervened),
            telemetry=telem_schema,
        )
