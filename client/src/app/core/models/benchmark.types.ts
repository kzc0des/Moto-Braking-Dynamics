export type BrakeType = 'disc' | 'drum';
export type SurfaceSubstrate = 'asphalt' | 'concrete' | 'gravel';
export type SurfaceContaminant = 'dry' | 'wet' | 'dusty';
export type ActuationType = 'progressive_squeeze' | 'sudden_lockup';

export interface VehicleParams {
  mass: number;                // kg
  wheelbase: number;           // m (L)
  cogDistanceFront: number;    // m (a)
  cogDistanceRear: number;     // m (b)
  cogHeight: number;           // m (h)
  wheelRadius: number;         // m (R_w)
  wheelInertia: number;        // kg·m² (I_w)
  dragCoefficient: number;     // C_d
  frontalArea: number;         // m² (A)
  brakeBiasRatio: number;      // γ in [0.0, 1.0]
}

export interface BrakeAssembly {
  brakeType: BrakeType;
  rotorMass: number;           // kg (m_d)
  specificHeat: number;        // J/(kg·K)
  surfaceArea: number;         // m²
  pistonArea: number;          // m²
  effectiveRadius: number;     // m (r_eff)
  padFrictionNominal: number;  // μ_pad,0
  fadeTemperature: number;     // °C
  fadeCoefficient: number;     // 1/°C
  fluidBoilTemperature: number;// °C
  vaporTransitionBand: number; // °C
  thermalEfficiency: number;
  drumAmplification: number;
}

export interface PotholeDefect {
  startX: number;              // m
  width: number;               // m
  severity: number;            // [0.0, 1.0]
}

export interface EnvironmentParams {
  substrate: SurfaceSubstrate;
  contaminant: SurfaceContaminant;
  roadGradeAngle: number;      // rad (positive = uphill, negative = downhill)
  curveRadius: number;         // m (Infinity for straight)
  potholeEnabled: boolean;
  pothole?: PotholeDefect;
  ambientTemperature: number;  // °C
  airDensity: number;          // kg/m³
}

export interface ActuationParams {
  type: ActuationType;
  targetPressure: number;      // Pa
  riseTime: number;            // s (only for progressive squeeze)
}

export interface SimulationConfig {
  initialVelocity: number;     // m/s (v_0)
  initialRotorTemp: number;    // °C
  hazardDistance: number;      // m (X_hazard)
  maxSimulationTime: number;   // s
  numTelemetryPoints: number;  // default 150
  standstillCutoffVelocity: number; // m/s (v_stop)
  lowSpeedEpsilon: number;     // m/s
}

export interface BenchmarkInstanceConfig {
  id: string;                  // 'instance-1' | 'instance-2' | 'instance-3'
  name: string;                // e.g. "Superbike 1000cc"
  enabled: boolean;
  colorAccent: string;         // Hex code, e.g. #fbbf24, #06b6d4, #a855f7
  vehicle: VehicleParams;
  brake: BrakeAssembly;
  actuation: ActuationParams;
  environment: EnvironmentParams;
  simulation: SimulationConfig;
}

export interface ArchetypePreset {
  key: string;
  name: string;
  description: string;
  config: Omit<BenchmarkInstanceConfig, 'id' | 'enabled' | 'colorAccent'>;
}
