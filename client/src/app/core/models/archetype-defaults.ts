import { BenchmarkInstanceConfig, VehicleSpriteKey } from './benchmark.types';

/**
 * 4 CORE GEOMETRY FAMILIES & 7 EMPIRICAL SUB-PRESETS
 * Calibrated against Vittore Cossalter (2006, Motorcycle Dynamics) and UNECE Regulation No. 78.
 * Documented in ADR 0019 and Table 2.1 of the Thesis Proposal.
 */

// ==========================================
// FAMILY 1: STEP-THROUGH / COMMUTER (Low h/L, Rear-Biased b/L, Low Stoppie Risk)
// ==========================================

export const ARCHETYPE_SMALL_SCOOTER_125: BenchmarkInstanceConfig = {
  id: 'instance-scooter-125',
  name: 'Small-Wheel Scooter 125cc',
  enabled: true,
  colorAccent: '#FFC800', // Pavement Line Yellow
  spriteKey: 'scooter',
  vehicle: {
    mass: 130.0,
    wheelbase: 1.28,
    cogDistanceFront: 0.54, // b/L ≈ 0.42
    cogDistanceRear: 0.74,
    cogHeight: 0.48,
    wheelRadius: 0.25,      // 10-12" wheels
    wheelInertia: 0.32,
    dragCoefficient: 0.75,
    frontalArea: 0.60,
    brakeBiasRatio: 0.45,   // Balanced rear braking due to rear engine weight
  },
  brake: {
    brakeType: 'drum',
    rotorMass: 1.10,
    specificHeat: 480.0,
    surfaceArea: 0.035,
    pistonArea: 0.0010,
    effectiveRadius: 0.105,
    padFrictionNominal: 0.35,
    fadeTemperature: 210.0,
    fadeCoefficient: 0.008,
    fluidBoilTemperature: 195.0,
    vaporTransitionBand: 25.0,
    thermalEfficiency: 0.85,
    drumAmplification: 1.8,
  },
  actuation: {
    type: 'progressive_squeeze',
    targetPressure: 4.5e6,
    riseTime: 0.35,
  },
  environment: {
    substrate: 'asphalt',
    contaminant: 'dry',
    roadGradeAngle: 0.0,
    curveRadius: Infinity,
    potholeEnabled: false,
    ambientTemperature: 25.0,
    airDensity: 1.225,
  },
  simulation: {
    initialVelocity: 16.67, // 60 km/h
    initialRotorTemp: 30.0,
    hazardDistance: 45.0,
    maxSimulationTime: 8.0,
    numTelemetryPoints: 150,
    standstillCutoffVelocity: 0.05,
    lowSpeedEpsilon: 0.10,
  },
};

export const ARCHETYPE_MAXI_SCOOTER_160: BenchmarkInstanceConfig = {
  id: 'instance-maxi-160',
  name: 'Maxi-Scooter 160cc ABS',
  enabled: false,
  colorAccent: '#2B6CB0',
  spriteKey: 'maxi',
  vehicle: {
    mass: 150.0,
    wheelbase: 1.35,
    cogDistanceFront: 0.59, // b/L ≈ 0.44
    cogDistanceRear: 0.76,
    cogHeight: 0.52,
    wheelRadius: 0.28,      // 14-15" wheels
    wheelInertia: 0.42,
    dragCoefficient: 0.70,
    frontalArea: 0.65,
    brakeBiasRatio: 0.40,
  },
  brake: {
    brakeType: 'disc',
    rotorMass: 1.30,
    specificHeat: 460.0,
    surfaceArea: 0.042,
    pistonArea: 0.0012,
    effectiveRadius: 0.120,
    padFrictionNominal: 0.40,
    fadeTemperature: 240.0,
    fadeCoefficient: 0.006,
    fluidBoilTemperature: 220.0,
    vaporTransitionBand: 20.0,
    thermalEfficiency: 0.90,
    drumAmplification: 1.0,
  },
  actuation: {
    type: 'progressive_squeeze',
    targetPressure: 5.2e6,
    riseTime: 0.35,
  },
  environment: {
    substrate: 'asphalt',
    contaminant: 'dry',
    roadGradeAngle: 0.0,
    curveRadius: Infinity,
    potholeEnabled: false,
    ambientTemperature: 25.0,
    airDensity: 1.225,
  },
  simulation: {
    initialVelocity: 22.22, // 80 km/h
    initialRotorTemp: 30.0,
    hazardDistance: 55.0,
    maxSimulationTime: 8.0,
    numTelemetryPoints: 150,
    standstillCutoffVelocity: 0.05,
    lowSpeedEpsilon: 0.10,
  },
};

export const ARCHETYPE_UNDERBONE_125: BenchmarkInstanceConfig = {
  id: 'instance-underbone-125',
  name: 'Underbone Commuter 125cc',
  enabled: false,
  colorAccent: '#1F9D55',
  spriteKey: 'underbone',
  vehicle: {
    mass: 115.0,
    wheelbase: 1.24,
    cogDistanceFront: 0.60, // b/L ≈ 0.48
    cogDistanceRear: 0.64,
    cogHeight: 0.51,
    wheelRadius: 0.30,      // 17" narrow tires
    wheelInertia: 0.38,
    dragCoefficient: 0.72,
    frontalArea: 0.58,
    brakeBiasRatio: 0.35,
  },
  brake: {
    brakeType: 'drum',
    rotorMass: 1.05,
    specificHeat: 480.0,
    surfaceArea: 0.032,
    pistonArea: 0.0010,
    effectiveRadius: 0.100,
    padFrictionNominal: 0.34,
    fadeTemperature: 200.0,
    fadeCoefficient: 0.008,
    fluidBoilTemperature: 190.0,
    vaporTransitionBand: 25.0,
    thermalEfficiency: 0.85,
    drumAmplification: 1.8,
  },
  actuation: {
    type: 'progressive_squeeze',
    targetPressure: 4.8e6,
    riseTime: 0.42, // Foot-pedal neuromuscular latency delay
  },
  environment: {
    substrate: 'asphalt',
    contaminant: 'dry',
    roadGradeAngle: 0.0,
    curveRadius: Infinity,
    potholeEnabled: false,
    ambientTemperature: 25.0,
    airDensity: 1.225,
  },
  simulation: {
    initialVelocity: 16.67, // 60 km/h
    initialRotorTemp: 28.0,
    hazardDistance: 45.0,
    maxSimulationTime: 8.0,
    numTelemetryPoints: 150,
    standstillCutoffVelocity: 0.05,
    lowSpeedEpsilon: 0.10,
  },
};

// ==========================================
// FAMILY 2: STANDARD ROADSTER (Neutral Geometry, Benchmark Baseline)
// ==========================================

export const ARCHETYPE_STANDARD_NAKED_250: BenchmarkInstanceConfig = {
  id: 'instance-naked-250',
  name: 'Standard / Naked 250cc',
  enabled: false,
  colorAccent: '#1F2328',
  spriteKey: 'naked',
  vehicle: {
    mass: 175.0,
    wheelbase: 1.40,
    cogDistanceFront: 0.70, // b/L ≈ 0.50
    cogDistanceRear: 0.70,
    cogHeight: 0.54,
    wheelRadius: 0.31,      // 17" tires
    wheelInertia: 0.55,
    dragCoefficient: 0.65,
    frontalArea: 0.68,
    brakeBiasRatio: 0.30,
  },
  brake: {
    brakeType: 'disc',
    rotorMass: 1.45,
    specificHeat: 460.0,
    surfaceArea: 0.048,
    pistonArea: 0.0014,
    effectiveRadius: 0.130,
    padFrictionNominal: 0.42,
    fadeTemperature: 260.0,
    fadeCoefficient: 0.006,
    fluidBoilTemperature: 230.0,
    vaporTransitionBand: 20.0,
    thermalEfficiency: 0.90,
    drumAmplification: 1.0,
  },
  actuation: {
    type: 'progressive_squeeze',
    targetPressure: 5.5e6,
    riseTime: 0.40,
  },
  environment: {
    substrate: 'asphalt',
    contaminant: 'dry',
    roadGradeAngle: 0.0,
    curveRadius: Infinity,
    potholeEnabled: false,
    ambientTemperature: 25.0,
    airDensity: 1.225,
  },
  simulation: {
    initialVelocity: 22.22, // 80 km/h
    initialRotorTemp: 30.0,
    hazardDistance: 55.0,
    maxSimulationTime: 8.0,
    numTelemetryPoints: 150,
    standstillCutoffVelocity: 0.05,
    lowSpeedEpsilon: 0.10,
  },
};

// ==========================================
// FAMILY 3: SUPERSPORT PERFORMANCE (High h/L, Rear-Lift Stoppie Critical)
// ==========================================

export const ARCHETYPE_SUPERSPORT_600: BenchmarkInstanceConfig = {
  id: 'instance-supersport-600',
  name: 'Supersport 600cc',
  enabled: false,
  colorAccent: '#D93A32',
  spriteKey: 'supersport',
  vehicle: {
    mass: 195.0,
    wheelbase: 1.40,
    cogDistanceFront: 0.73, // b/L ≈ 0.52
    cogDistanceRear: 0.67,
    cogHeight: 0.60,        // High CoG relative to compact wheelbase
    wheelRadius: 0.31,
    wheelInertia: 0.62,
    dragCoefficient: 0.56,
    frontalArea: 0.62,
    brakeBiasRatio: 0.20,   // Extreme front load transfer (>85%)
  },
  brake: {
    brakeType: 'disc',
    rotorMass: 1.65,
    specificHeat: 460.0,
    surfaceArea: 0.058,
    pistonArea: 0.0018,
    effectiveRadius: 0.140,
    padFrictionNominal: 0.46,
    fadeTemperature: 290.0,
    fadeCoefficient: 0.005,
    fluidBoilTemperature: 250.0,
    vaporTransitionBand: 18.0,
    thermalEfficiency: 0.92,
    drumAmplification: 1.0,
  },
  actuation: {
    type: 'progressive_squeeze',
    targetPressure: 6.2e6,
    riseTime: 0.38,
  },
  environment: {
    substrate: 'asphalt',
    contaminant: 'dry',
    roadGradeAngle: 0.0,
    curveRadius: Infinity,
    potholeEnabled: false,
    ambientTemperature: 25.0,
    airDensity: 1.225,
  },
  simulation: {
    initialVelocity: 27.78, // 100 km/h
    initialRotorTemp: 35.0,
    hazardDistance: 65.0,
    maxSimulationTime: 8.0,
    numTelemetryPoints: 150,
    standstillCutoffVelocity: 0.05,
    lowSpeedEpsilon: 0.10,
  },
};

// ==========================================
// FAMILY 4: EXTENDED GEOMETRY (Polar Extremes: Adventure & Cruiser)
// ==========================================

export const ARCHETYPE_ADVENTURE_300: BenchmarkInstanceConfig = {
  id: 'instance-adventure-300',
  name: 'Adventure / Trail 300cc',
  enabled: false,
  colorAccent: '#E8750F',
  spriteKey: 'adventure',
  vehicle: {
    mass: 175.0,
    wheelbase: 1.45,
    cogDistanceFront: 0.74, // b/L ≈ 0.51
    cogDistanceRear: 0.71,
    cogHeight: 0.66,        // Tall suspension stroke, deep fork dive
    wheelRadius: 0.35,      // 19-21" front wheel
    wheelInertia: 0.60,
    dragCoefficient: 0.70,
    frontalArea: 0.72,
    brakeBiasRatio: 0.30,
  },
  brake: {
    brakeType: 'disc',
    rotorMass: 1.40,
    specificHeat: 460.0,
    surfaceArea: 0.046,
    pistonArea: 0.0013,
    effectiveRadius: 0.130,
    padFrictionNominal: 0.40,
    fadeTemperature: 250.0,
    fadeCoefficient: 0.006,
    fluidBoilTemperature: 230.0,
    vaporTransitionBand: 20.0,
    thermalEfficiency: 0.90,
    drumAmplification: 1.0,
  },
  actuation: {
    type: 'progressive_squeeze',
    targetPressure: 5.4e6,
    riseTime: 0.42,
  },
  environment: {
    substrate: 'asphalt',
    contaminant: 'dry',
    roadGradeAngle: 0.0,
    curveRadius: Infinity,
    potholeEnabled: false,
    ambientTemperature: 25.0,
    airDensity: 1.225,
  },
  simulation: {
    initialVelocity: 22.22, // 80 km/h
    initialRotorTemp: 30.0,
    hazardDistance: 55.0,
    maxSimulationTime: 8.0,
    numTelemetryPoints: 150,
    standstillCutoffVelocity: 0.05,
    lowSpeedEpsilon: 0.10,
  },
};

export const ARCHETYPE_CRUISER_650: BenchmarkInstanceConfig = {
  id: 'instance-cruiser-650',
  name: 'Cruiser / Touring 650cc',
  enabled: false,
  colorAccent: '#656C76',
  spriteKey: 'cruiser',
  vehicle: {
    mass: 250.0,
    wheelbase: 1.58,
    cogDistanceFront: 0.71, // b/L ≈ 0.45
    cogDistanceRear: 0.87,
    cogHeight: 0.48,        // Low CoG, long wheelbase, no pitch-over
    wheelRadius: 0.33,
    wheelInertia: 0.80,
    dragCoefficient: 0.68,
    frontalArea: 0.80,
    brakeBiasRatio: 0.40,   // High rear brake contribution
  },
  brake: {
    brakeType: 'disc',
    rotorMass: 1.80,
    specificHeat: 460.0,
    surfaceArea: 0.052,
    pistonArea: 0.0015,
    effectiveRadius: 0.135,
    padFrictionNominal: 0.38,
    fadeTemperature: 250.0,
    fadeCoefficient: 0.006,
    fluidBoilTemperature: 220.0,
    vaporTransitionBand: 20.0,
    thermalEfficiency: 0.90,
    drumAmplification: 1.0,
  },
  actuation: {
    type: 'progressive_squeeze',
    targetPressure: 5.0e6,
    riseTime: 0.50,
  },
  environment: {
    substrate: 'asphalt',
    contaminant: 'dry',
    roadGradeAngle: 0.0,
    curveRadius: Infinity,
    potholeEnabled: false,
    ambientTemperature: 25.0,
    airDensity: 1.225,
  },
  simulation: {
    initialVelocity: 22.22, // 80 km/h
    initialRotorTemp: 30.0,
    hazardDistance: 55.0,
    maxSimulationTime: 8.0,
    numTelemetryPoints: 150,
    standstillCutoffVelocity: 0.05,
    lowSpeedEpsilon: 0.10,
  },
};

// ==========================================
// BACKWARD-COMPATIBILITY EXPORTS & REGISTRY
// ==========================================

export const DEFAULT_SUPERBIKE: BenchmarkInstanceConfig = {
  ...ARCHETYPE_SUPERSPORT_600,
  id: 'instance-1',
  name: 'Superbike 1000cc',
  enabled: true,
  colorAccent: '#FFC800',
  spriteKey: 'supersport'
};

export const DEFAULT_CRUISER: BenchmarkInstanceConfig = {
  ...ARCHETYPE_CRUISER_650,
  id: 'instance-2',
  name: 'Cruiser 650cc',
  enabled: false,
  colorAccent: '#1F2328'
};

export const DEFAULT_SCOOTER: BenchmarkInstanceConfig = {
  ...ARCHETYPE_SMALL_SCOOTER_125,
  id: 'instance-3',
  name: 'Urban Scooter 125cc',
  enabled: false,
  colorAccent: '#2B6CB0'
};

export interface EmpiricalPresetDescriptor {
  key: string;
  familyKey: 'step_through' | 'standard' | 'supersport' | 'extended';
  name: string;
  spriteKey: VehicleSpriteKey;
  displacementCc: number;
  massKg: number;
  wheelbase: number;
  cogHeight: number;
  frontBrake: 'single_disc' | 'dual_disc';
  rearBrake: 'drum' | 'disc';
  actuation: 'independent' | 'cbs' | 'abs';
  rearControl: 'hand_lever' | 'foot_pedal';
  rotorDiameterMm: number;
  padFriction: number;
  fluidBoilTemp: number;
  description: string;
}

export const EMPIRICAL_PRESETS: EmpiricalPresetDescriptor[] = [
  {
    key: 'scooter_125',
    familyKey: 'step_through',
    name: 'Small-Wheel Scooter 125cc',
    spriteKey: 'scooter',
    displacementCc: 125,
    massKg: 130,
    wheelbase: 1.28,
    cogHeight: 0.48,
    frontBrake: 'single_disc',
    rearBrake: 'drum',
    actuation: 'cbs',
    rearControl: 'hand_lever',
    rotorDiameterMm: 220,
    padFriction: 0.35,
    fluidBoilTemp: 210,
    description: 'Enclosed engine on swingarm, rear-biased CoG, high rear lockup propensity, CBS.'
  },
  {
    key: 'maxi_160',
    familyKey: 'step_through',
    name: 'Maxi-Scooter 160cc ABS',
    spriteKey: 'maxi',
    displacementCc: 160,
    massKg: 150,
    wheelbase: 1.35,
    cogHeight: 0.52,
    frontBrake: 'single_disc',
    rearBrake: 'disc',
    actuation: 'abs',
    rearControl: 'hand_lever',
    rotorDiameterMm: 260,
    padFriction: 0.40,
    fluidBoilTemp: 220,
    description: 'Heavier chassis, 14-15" wheels, dual hydraulic discs, ABS slip regulation.'
  },
  {
    key: 'underbone_125',
    familyKey: 'step_through',
    name: 'Underbone Commuter 125cc',
    spriteKey: 'underbone',
    displacementCc: 125,
    massKg: 115,
    wheelbase: 1.24,
    cogHeight: 0.51,
    frontBrake: 'single_disc',
    rearBrake: 'drum',
    actuation: 'independent',
    rearControl: 'foot_pedal',
    rotorDiameterMm: 220,
    padFriction: 0.34,
    fluidBoilTemp: 200,
    description: '17" narrow wheels, backbone frame, right foot pedal mechanical rod drum.'
  },
  {
    key: 'naked_250',
    familyKey: 'standard',
    name: 'Standard / Naked 250cc',
    spriteKey: 'naked',
    displacementCc: 250,
    massKg: 175,
    wheelbase: 1.40,
    cogHeight: 0.54,
    frontBrake: 'single_disc',
    rearBrake: 'disc',
    actuation: 'independent',
    rearControl: 'foot_pedal',
    rotorDiameterMm: 290,
    padFriction: 0.42,
    fluidBoilTemp: 230,
    description: 'Neutral upright ergonomics, Cossalter control benchmark, balanced load transfer.'
  },
  {
    key: 'supersport_600',
    familyKey: 'supersport',
    name: 'Supersport 600cc',
    spriteKey: 'supersport',
    displacementCc: 600,
    massKg: 195,
    wheelbase: 1.40,
    cogHeight: 0.60,
    frontBrake: 'dual_disc',
    rearBrake: 'disc',
    actuation: 'independent',
    rearControl: 'foot_pedal',
    rotorDiameterMm: 310,
    padFriction: 0.46,
    fluidBoilTemp: 250,
    description: 'Short wheelbase, high CoG, twin front radial discs, rear lift-off stoppie limit.'
  },
  {
    key: 'adventure_300',
    familyKey: 'extended',
    name: 'Adventure / Trail 300cc',
    spriteKey: 'adventure',
    displacementCc: 300,
    massKg: 175,
    wheelbase: 1.45,
    cogHeight: 0.66,
    frontBrake: 'single_disc',
    rearBrake: 'disc',
    actuation: 'abs',
    rearControl: 'foot_pedal',
    rotorDiameterMm: 300,
    padFriction: 0.40,
    fluidBoilTemp: 230,
    description: 'Long suspension stroke, high ground clearance, massive front fork dive transient.'
  },
  {
    key: 'cruiser_650',
    familyKey: 'extended',
    name: 'Cruiser / Touring 650cc',
    spriteKey: 'cruiser',
    displacementCc: 650,
    massKg: 250,
    wheelbase: 1.58,
    cogHeight: 0.48,
    frontBrake: 'single_disc',
    rearBrake: 'disc',
    actuation: 'independent',
    rearControl: 'foot_pedal',
    rotorDiameterMm: 300,
    padFriction: 0.38,
    fluidBoilTemp: 220,
    description: 'Long wheelbase, low CoG, zero stoppie risk, high rear braking contribution.'
  }
];
