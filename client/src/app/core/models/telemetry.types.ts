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
}

export interface InstanceSimulationResult {
  instanceId: string;
  terminalOutcome: TerminalOutcome;
  stoppingDistance: number;    // m
  stoppingTime: number;        // s
  peakDeceleration: number;    // m/s²
  finalVelocity: number;       // m/s
  maxRotorTemp: number;        // °C
  rearLiftOffOccurred: boolean;
  frontWashoutOccurred: boolean;
  fluidBoilOccurred: boolean;
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
}
