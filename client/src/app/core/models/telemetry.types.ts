export type TerminalOutcome = 
  | 'Safe Stop'
  | 'Barrier Collision'
  | 'Front-Wheel Washout'
  | 'Rear-Wheel Lift-off';

export interface TelemetrySeries {
  time: number[];              // s
  distance: number[];          // m (x)
  velocity: number[];          // m/s (v)
  deceleration: number[];      // m/s² (a)
  omega: number[];             // rad/s (wheel angular velocity)
  slipRatioFront: number[];    // κ front
  slipRatioRear: number[];     // κ rear
  normalLoadFront: number[];   // N (F_z front)
  normalLoadRear: number[];    // N (F_z rear)
  rotorTemperature: number[];  // °C
  absActiveFront?: boolean[];  // ADR 0027 ABS intervention flag
  absActiveRear?: boolean[];   // ADR 0027 ABS intervention flag
}

export interface InstanceSimulationResult {
  instanceId: string;
  terminalOutcome: TerminalOutcome;
  stoppingDistance: number;    // m (total including Phase 1 reaction)
  stoppingTime: number;        // s
  peakDeceleration: number;    // m/s²
  finalVelocity: number;       // m/s
  maxRotorTemp: number;        // °C
  reactionDistance?: number;   // m (Phase 1 free-rolling)
  mechanicalBrakingDistance?: number; // m (Phase 2 mechanical)
  peakFrontLeverPct?: number;  // %
  peakRearControlPct?: number; // %
  peakFrontPressureMpa?: number; // MPa
  peakRearPressureMpa?: number;  // MPa
  rearLiftOffOccurred: boolean;
  frontWashoutOccurred: boolean;
  fluidBoilOccurred: boolean;
  rearLockupOccurred?: boolean; // ADR 0027 rear wheel lockup indicator
  absIntervened?: boolean;     // ADR 0027 active ABS modulation indicator
  telemetry: TelemetrySeries;
}

export interface BenchmarkResponse {
  solverExecutionTimeMs: number;
  instances: InstanceSimulationResult[];
  warnings: string[];
}

export interface InterpolatedScrubFrame {
  time: number;
  distance: number;
  velocity: number;
  deceleration: number;
  omega: number;
  slipRatioFront: number;
  slipRatioRear: number;
  normalLoadFront: number;
  normalLoadRear: number;
  rotorTemperature: number;
  terminalOutcome: TerminalOutcome;
  isBrakingActive?: boolean;   // true if t >= t_rxn
  frontLeverPct?: number;
  rearControlPct?: number;
  absActiveFront?: boolean;
  absActiveRear?: boolean;
}
