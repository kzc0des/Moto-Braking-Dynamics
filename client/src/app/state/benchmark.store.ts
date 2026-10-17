import { Injectable, inject, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, catchError, tap } from 'rxjs/operators';
import { BenchmarkInstanceConfig, VehicleSpriteKey, AbsConfiguration, BrakeType } from '../core/models/benchmark.types';
import { DEFAULT_SUPERBIKE, DEFAULT_CRUISER, DEFAULT_SCOOTER } from '../core/models/archetype-defaults';
import { InstanceSimulationResult, InterpolatedScrubFrame, BenchmarkResponse, TerminalOutcome } from '../core/models/telemetry.types';
import { SimulationApiService } from '../core/api/simulation-api.service';
import { DiagnosticsService } from '../features/diagnostics/diagnostics.service';

@Injectable({
  providedIn: 'root'
})
export class BenchmarkStore {
  private readonly api = inject(SimulationApiService);
  private readonly diagnostics = inject(DiagnosticsService);
  private readonly platformId = inject(PLATFORM_ID);

  // --- Benchmark State ---
  readonly instances = signal<BenchmarkInstanceConfig[]>([
    DEFAULT_SUPERBIKE,
    DEFAULT_CRUISER,
    DEFAULT_SCOOTER
  ]);

  readonly selectedInstanceId = signal<string>('instance-1');
  readonly activeResults = signal<InstanceSimulationResult[]>([]);
  readonly activeWarnings = signal<string[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly autoCompute = signal<boolean>(true);
  readonly engineStatus = signal<'connected' | 'fallback'>('connected');

  // --- Playback & Scrubbing State ---
  readonly scrubTime = signal<number>(0.0);
  readonly isPlaying = signal<boolean>(false);
  readonly playbackSpeed = signal<number>(1.0);
  readonly isVehicleConfigured = signal<boolean>(false);

  // Debounce pipeline for auto-recomputation
  private readonly triggerSimulation$ = new Subject<void>();

  // --- Computed Selectors ---
  readonly selectedInstance = computed(() => {
    const list = this.instances();
    const id = this.selectedInstanceId();
    return list.find(i => i.id === id) ?? list[0];
  });

  readonly enabledInstances = computed(() => {
    return this.instances().filter(i => i.enabled);
  });

  readonly maxRunTime = computed(() => {
    const results = this.activeResults();
    if (results.length === 0) return 4.0;
    const maxT = Math.max(...results.map(r => r.stoppingTime));
    return maxT > 0 ? maxT : 4.0;
  });

  readonly maxStoppingDistance = computed(() => {
    const results = this.activeResults();
    if (results.length === 0) return 55.0;
    const maxD = Math.max(...results.map(r => r.stoppingDistance));
    return Math.max(maxD, 55.0);
  });

  readonly scrubFrames = computed<Record<string, InterpolatedScrubFrame>>(() => {
    const t = this.scrubTime();
    const frames: Record<string, InterpolatedScrubFrame> = {};

    for (const res of this.activeResults()) {
      const telem = res.telemetry;
      if (!telem || telem.time.length === 0) continue;

      frames[res.instanceId] = this.interpolateTelemetry(telem, t, res.terminalOutcome);
    }

    return frames;
  });

  constructor() {
    // Setup reactive simulation debounce
    this.triggerSimulation$.pipe(
      debounceTime(200),
      switchMap(() => {
        const enabled = this.enabledInstances();
        if (enabled.length === 0) return of(null);

        if (!isPlatformBrowser(this.platformId)) {
          this.engineStatus.set('fallback');
          this.generateLocalFallbackResults();
          return of(null);
        }

        this.isLoading.set(true);
        const startTime = performance.now();
        const payload = { instances: enabled };

        return this.api.runBenchmark(payload).pipe(
          tap((response: BenchmarkResponse) => {
            const latency = Math.round(performance.now() - startTime);
            this.engineStatus.set('connected');
            this.activeResults.set(response.instances);
            this.activeWarnings.set(response.warnings || []);
            this.isLoading.set(false);

            this.diagnostics.recordMetrics(
              {
                roundtripLatencyMs: latency,
                solverExecutionTimeMs: response.solverExecutionTimeMs,
                lastRunTimestamp: new Date().toLocaleTimeString(),
                pointsGenerated: response.instances[0]?.telemetry?.time?.length ?? 0,
                activeWarnings: response.warnings || []
              },
              payload,
              response
            );
          }),
          catchError(err => {
            this.isLoading.set(false);
            this.engineStatus.set('fallback');
            console.warn('[BenchmarkStore] Simulation API error, falling back to local approximation:', err);
            this.generateLocalFallbackResults();
            this.diagnostics.recordMetrics(
              {
                roundtripLatencyMs: 0,
                solverExecutionTimeMs: 0,
                lastRunTimestamp: new Date().toLocaleTimeString(),
                pointsGenerated: 150,
                activeWarnings: ['FastAPI Backend Offline — Results running on client-side approximation fallback']
              },
              payload,
              { fallback: true }
            );
            return of(null);
          })
        );
      })
    ).subscribe();

    // Trigger initial run
    this.triggerSimulation();
  }

  // --- Actions ---

  triggerSimulation(): void {
    this.triggerSimulation$.next();
  }

  setSelectedInstanceId(id: string): void {
    this.selectedInstanceId.set(id);
  }

  toggleInstanceEnabled(id: string): void {
    this.instances.update(list =>
      list.map(inst => (inst.id === id ? { ...inst, enabled: !inst.enabled } : inst))
    );
    if (this.autoCompute()) {
      this.triggerSimulation();
    }
  }

  updateSelectedInstance<K extends keyof BenchmarkInstanceConfig>(
    section: K,
    value: BenchmarkInstanceConfig[K]
  ): void {
    const activeId = this.selectedInstanceId();
    this.instances.update(list => {
      const targetId = list.some(i => i.id === activeId) ? activeId : (list[0]?.id ?? 'instance-1');
      return list.map(inst => (inst.id === targetId ? { ...inst, [section]: value } : inst));
    });
    this.resetPlayback();
    if (this.autoCompute()) {
      this.triggerSimulation();
    }
  }

  updateVehicleParam<K extends keyof BenchmarkInstanceConfig['vehicle']>(
    key: K,
    val: BenchmarkInstanceConfig['vehicle'][K]
  ): void {
    const activeId = this.selectedInstanceId();
    this.instances.update(list => {
      const targetId = list.some(i => i.id === activeId) ? activeId : (list[0]?.id ?? 'instance-1');
      return list.map(inst => {
        if (inst.id !== targetId) return inst;
        return {
          ...inst,
          vehicle: { ...inst.vehicle, [key]: val }
        };
      });
    });
    this.resetPlayback();
    if (this.autoCompute()) {
      this.triggerSimulation();
    }
  }

  updateActuationParam<K extends keyof BenchmarkInstanceConfig['actuation']>(
    key: K,
    val: BenchmarkInstanceConfig['actuation'][K]
  ): void {
    const activeId = this.selectedInstanceId();
    this.instances.update(list => {
      const targetId = list.some(i => i.id === activeId) ? activeId : (list[0]?.id ?? 'instance-1');
      return list.map(inst => {
        if (inst.id !== targetId) return inst;
        return {
          ...inst,
          actuation: { ...inst.actuation, [key]: val }
        };
      });
    });
    this.resetPlayback();
    if (this.autoCompute()) {
      this.triggerSimulation();
    }
  }

  updateEnvironmentParam<K extends keyof BenchmarkInstanceConfig['environment']>(
    key: K,
    val: BenchmarkInstanceConfig['environment'][K]
  ): void {
    const activeId = this.selectedInstanceId();
    this.instances.update(list => {
      const targetId = list.some(i => i.id === activeId) ? activeId : (list[0]?.id ?? 'instance-1');
      return list.map(inst => {
        if (inst.id !== targetId) return inst;
        return {
          ...inst,
          environment: { ...inst.environment, [key]: val }
        };
      });
    });
    this.resetPlayback();
    if (this.autoCompute()) {
      this.triggerSimulation();
    }
  }

  updateAbsConfiguration(config: AbsConfiguration): void {
    const activeId = this.selectedInstanceId();
    this.instances.update(list => {
      const targetId = list.some(i => i.id === activeId) ? activeId : (list[0]?.id ?? 'instance-1');
      return list.map(inst => (inst.id === targetId ? { ...inst, absConfiguration: config } : inst));
    });
    this.resetPlayback();
    if (this.autoCompute()) {
      this.triggerSimulation();
    }
  }

  setScrubTime(t: number): void {
    const clamped = Math.max(0, Math.min(t, this.maxRunTime()));
    this.scrubTime.set(clamped);
  }

  togglePlay(): void {
    if (!this.isPlaying() && this.scrubTime() >= this.maxRunTime() - 0.05) {
      this.scrubTime.set(0);
    }
    this.isPlaying.update(p => !p);
  }

  pause(): void {
    this.isPlaying.set(false);
  }

  resetPlayback(): void {
    this.isPlaying.set(false);
    this.scrubTime.set(0);
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed.set(speed);
  }

  toggleAutoCompute(): void {
    this.autoCompute.update(a => !a);
  }

  configureBaselineScooter(): void {
    this.instances.update(list => {
      return list.map(inst => {
        if (inst.id === 'instance-1') {
          return {
            ...inst,
            name: '125cc Commuter Scooter',
            enabled: true,
            vehicle: {
              ...inst.vehicle,
              mass: 165.0,
              wheelbase: 1.28,
              cogHeight: 0.62,
              cogDistanceFront: 0.64,
              cogDistanceRear: 0.64,
              brakeBiasRatio: 0.30
            },
            brake: {
              ...inst.brake,
              brakeType: 'drum',
              rotorMass: 1.20,
              effectiveRadius: 0.110,
              padFrictionNominal: 0.35,
              fluidBoilTemperature: 230.0
            },
            simulation: {
              ...inst.simulation,
              initialVelocity: 16.67,
              hazardDistance: 35.0
            }
          };
        }
        return { ...inst, enabled: false };
      });
    });
    this.selectedInstanceId.set('instance-1');
    this.isVehicleConfigured.set(true);
    this.triggerSimulation();
  }

  configureCustomVehicle(custom: {
    category: string;
    title: string;
    spriteKey?: VehicleSpriteKey;
    displacementCc: number;
    massKg: number;
    frontBrake: string;
    rearBrake: string;
    actuation: string;
    wheelbase: number;
    cogHeight: number;
    rotorDiameterMm: number;
    padFriction: number;
    fluidBoilTemp: number;
    initialVelocity?: number;
    hazardDistance?: number;
    frontLeverPct?: number;
    rearControlPct?: number;
    absConfiguration?: AbsConfiguration;
  }): void {
    this.instances.update(list => {
      const targetId = list.some(i => i.id === 'instance-1') ? 'instance-1' : (list[0]?.id ?? 'instance-1');
      return list.map(inst => {
        if (inst.id === targetId) {
          // Calculate empirical CoG distribution ratio (b/L) grounded in Cossalter (2006)
          let biasRatio = 0.50; // neutral default (Standard / Roadster)
          const cat = custom.category.toLowerCase();
          if (cat === 'step_through' || cat === 'scooter') biasRatio = 0.42;
          else if (cat === 'underbone') biasRatio = 0.48;
          else if (cat === 'supersport' || cat === 'sport') biasRatio = 0.52;
          else if (cat === 'cruiser') biasRatio = 0.45;
          else if (cat === 'adventure') biasRatio = 0.51;
          else if (cat === 'extended') biasRatio = custom.wheelbase > 1.50 ? 0.45 : 0.51;

          let spriteKey: VehicleSpriteKey = custom.spriteKey || 'naked';
          if (!custom.spriteKey) {
            if (cat === 'step_through' || cat === 'scooter') spriteKey = 'scooter';
            else if (cat === 'underbone') spriteKey = 'underbone';
            else if (cat === 'supersport' || cat === 'sport') spriteKey = 'supersport';
            else if (cat === 'cruiser') spriteKey = 'cruiser';
            else if (cat === 'adventure') spriteKey = 'adventure';
            else if (cat === 'extended') spriteKey = custom.wheelbase > 1.50 ? 'cruiser' : 'adventure';
          }

          const cogFront = Number((custom.wheelbase * biasRatio).toFixed(2));
          const cogRear = Number((custom.wheelbase * (1.0 - biasRatio)).toFixed(2));

          const isDualFront = custom.frontBrake === 'dual_disc';
          const isRearDrum = custom.rearBrake === 'drum';
          const effectiveAbs: AbsConfiguration = custom.absConfiguration ?? (custom.actuation === 'abs' ? (isRearDrum ? 'single_channel_front' : 'dual_channel') : 'none');

          const frontBrakeAssembly = {
            brakeType: 'disc' as const,
            rotorMass: isDualFront ? 2.4 : (custom.rotorDiameterMm > 280 ? 1.6 : 1.2),
            specificHeat: 460.0,
            surfaceArea: isDualFront ? 0.08 : 0.045,
            pistonArea: isDualFront ? 0.0028 : 0.0014,
            effectiveRadius: Number((custom.rotorDiameterMm / 2000).toFixed(3)),
            padFrictionNominal: custom.padFriction,
            fadeTemperature: 240.0,
            fadeCoefficient: 0.006,
            fluidBoilTemperature: custom.fluidBoilTemp,
            vaporTransitionBand: 20.0,
            thermalEfficiency: 0.90,
            drumAmplification: 1.0
          };

          const rearBrakeAssembly = {
            brakeType: (isRearDrum ? 'drum' : 'disc') as BrakeType,
            rotorMass: isRearDrum ? 1.1 : 1.1,
            specificHeat: isRearDrum ? 480.0 : 460.0,
            surfaceArea: isRearDrum ? 0.035 : 0.035,
            pistonArea: 0.0010,
            effectiveRadius: isRearDrum ? 0.105 : 0.110,
            padFrictionNominal: isRearDrum ? 0.35 : custom.padFriction,
            fadeTemperature: isRearDrum ? 210.0 : 230.0,
            fadeCoefficient: isRearDrum ? 0.008 : 0.006,
            fluidBoilTemperature: isRearDrum ? 200.0 : custom.fluidBoilTemp,
            vaporTransitionBand: 20.0,
            thermalEfficiency: isRearDrum ? 0.85 : 0.90,
            drumAmplification: isRearDrum ? 1.8 : 1.0
          };

          return {
            ...inst,
            name: custom.title || `${custom.displacementCc}cc Custom ${custom.category}`,
            enabled: true,
            spriteKey: spriteKey,
            absConfiguration: effectiveAbs,
            frontBrake: frontBrakeAssembly,
            rearBrake: rearBrakeAssembly,
            vehicle: {
              ...inst.vehicle,
              mass: custom.massKg,
              wheelbase: custom.wheelbase,
              cogHeight: custom.cogHeight,
              cogDistanceFront: cogFront,
              cogDistanceRear: cogRear,
              brakeBiasRatio: isRearDrum ? 0.35 : 0.30
            },
            brake: frontBrakeAssembly,
            actuation: {
              ...inst.actuation,
              frontLeverPct: custom.frontLeverPct ?? inst.actuation.frontLeverPct ?? 85,
              rearControlPct: custom.rearControlPct ?? inst.actuation.rearControlPct ?? 65
            },
            simulation: {
              ...inst.simulation,
              initialVelocity: custom.initialVelocity ?? 16.67,
              hazardDistance: custom.hazardDistance ?? 35.0
            }
          };
        }
        return { ...inst, enabled: false };
      });
    });
    this.selectedInstanceId.set('instance-1');
    this.isVehicleConfigured.set(true);
    this.resetPlayback();
    this.triggerSimulation();
  }

  // --- Telemetry Interpolation Helper ---
  private interpolateTelemetry(
    telem: InstanceSimulationResult['telemetry'],
    t: number,
    terminalOutcome: InstanceSimulationResult['terminalOutcome']
  ): InterpolatedScrubFrame {
    const times = telem.time;
    if (t <= times[0]) {
      return {
        time: times[0],
        distance: telem.distance[0],
        velocity: telem.velocity[0],
        deceleration: telem.deceleration[0],
        omega: telem.omega[0],
        slipRatioFront: telem.slipRatioFront[0],
        slipRatioRear: telem.slipRatioRear[0],
        normalLoadFront: telem.normalLoadFront[0],
        normalLoadRear: telem.normalLoadRear[0],
        rotorTemperature: telem.rotorTemperature[0],
        terminalOutcome
      };
    }

    const lastIdx = times.length - 1;
    if (t >= times[lastIdx]) {
      return {
        time: times[lastIdx],
        distance: telem.distance[lastIdx],
        velocity: telem.velocity[lastIdx],
        deceleration: telem.deceleration[lastIdx],
        omega: telem.omega[lastIdx],
        slipRatioFront: telem.slipRatioFront[lastIdx],
        slipRatioRear: telem.slipRatioRear[lastIdx],
        normalLoadFront: telem.normalLoadFront[lastIdx],
        normalLoadRear: telem.normalLoadRear[lastIdx],
        rotorTemperature: telem.rotorTemperature[lastIdx],
        terminalOutcome
      };
    }

    // Binary search for interval
    let low = 0;
    let high = lastIdx;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (times[mid] < t) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const i0 = Math.max(0, low - 1);
    const i1 = Math.min(lastIdx, low);
    const dt = times[i1] - times[i0];
    const alpha = dt > 1e-6 ? (t - times[i0]) / dt : 0;

    const lerp = (arr: number[]) => arr[i0] + alpha * (arr[i1] - arr[i0]);

    return {
      time: t,
      distance: lerp(telem.distance),
      velocity: lerp(telem.velocity),
      deceleration: lerp(telem.deceleration),
      omega: lerp(telem.omega),
      slipRatioFront: lerp(telem.slipRatioFront),
      slipRatioRear: lerp(telem.slipRatioRear),
      normalLoadFront: lerp(telem.normalLoadFront),
      normalLoadRear: lerp(telem.normalLoadRear),
      rotorTemperature: lerp(telem.rotorTemperature),
      absActiveFront: telem.absActiveFront ? telem.absActiveFront[i1] : false,
      absActiveRear: telem.absActiveRear ? telem.absActiveRear[i1] : false,
      terminalOutcome,
      isBrakingActive: t >= 1.0
    };
  }

  // --- Local Fallback Generator (Two-Phase Green 2000 & Biomechanical Dual-Brake Solver) ---
  private generateLocalFallbackResults(): void {
    const results: InstanceSimulationResult[] = this.enabledInstances().map(inst => {
      const N = 150;
      const v0 = inst.simulation.initialVelocity;
      const m = inst.vehicle.mass;
      const L = inst.vehicle.wheelbase;
      const h = inst.vehicle.cogHeight;
      const x_hazard = inst.simulation.hazardDistance;

      // Phase 1: Human perception-reaction delay (Green 2000)
      const t_rxn = 1.0; // s
      const d_rxn = Number((v0 * t_rxn).toFixed(2));

      // Friction & Grade
      const baseMu = inst.environment.substrate === 'asphalt' ? 0.85 : inst.environment.substrate === 'concrete' ? 0.80 : 0.54;
      const conFactor = inst.environment.contaminant === 'dry' ? 1.0 : inst.environment.contaminant === 'wet' ? 0.65 : 0.50;
      const mu = Number((baseMu * conFactor).toFixed(2));
      const th = inst.environment.roadGradeAngle;

      // Biomechanical Dual-Brake Actuation
      const frontLeverPct = inst.actuation.frontLeverPct ?? 85;
      const rearControlPct = inst.actuation.rearControlPct ?? 65;
      const frontWeight = 1 - inst.vehicle.brakeBiasRatio;
      const rearWeight = inst.vehicle.brakeBiasRatio;
      const modulationEff = Math.min(1.0, Math.max(0.2, ((frontLeverPct / 100) * frontWeight + (rearControlPct / 100) * rearWeight)));

      // Deceleration efficiency
      const eff = 0.85 * modulationEff;
      const avgDecel = Number(Math.max(0.5, 9.81 * (mu * eff * Math.cos(th) + Math.sin(th))).toFixed(2));

      // Mechanical Braking Phase
      const t_brake = Number((v0 / avgDecel).toFixed(2));
      const d_brake = Number(((v0 * v0) / (2 * avgDecel)).toFixed(2));

      const d_total = Number((d_rxn + d_brake).toFixed(2));
      const t_total = Number((t_rxn + t_brake).toFixed(2));

      // Barrier collision calculation
      const isCollision = d_total > x_hazard;
      let finalVelocity = 0;
      let stopDist = d_total;
      let stopTime = t_total;

      if (isCollision) {
        stopDist = x_hazard;
        if (d_rxn >= x_hazard) {
          finalVelocity = v0;
          stopTime = Number((x_hazard / v0).toFixed(2));
        } else {
          const deltaX = x_hazard - d_rxn;
          const v_imp_sq = Math.max(0, v0 * v0 - 2 * avgDecel * deltaX);
          finalVelocity = Number(Math.sqrt(v_imp_sq).toFixed(2));
          const t_brk_imp = (v0 - finalVelocity) / avgDecel;
          stopTime = Number((t_rxn + t_brk_imp).toFixed(2));
        }
      }

      const time: number[] = [];
      const distance: number[] = [];
      const velocity: number[] = [];
      const deceleration: number[] = [];
      const omega: number[] = [];
      const slipRatioFront: number[] = [];
      const slipRatioRear: number[] = [];
      const normalLoadFront: number[] = [];
      const normalLoadRear: number[] = [];
      const rotorTemperature: number[] = [];

      const Fz_static_front = (inst.vehicle.cogDistanceRear / L) * m * 9.81;
      const Fz_static_rear = (inst.vehicle.cogDistanceFront / L) * m * 9.81;

      for (let i = 0; i < N; i++) {
        const curT = (i / (N - 1)) * stopTime;
        time.push(curT);

        let curX = 0;
        let curV = v0;
        let curA = 0;
        let isBraking = false;

        if (curT <= t_rxn) {
          // Phase 1: Free-rolling Reaction
          curX = Math.min(x_hazard, v0 * curT);
          curV = v0;
          curA = 0;
          isBraking = false;
        } else {
          // Phase 2: Active Mechanical Braking
          isBraking = true;
          const t_b = curT - t_rxn;
          curV = Math.max(finalVelocity, v0 - avgDecel * t_b);
          curA = avgDecel;
          curX = Math.min(stopDist, d_rxn + v0 * t_b - 0.5 * avgDecel * t_b * t_b);
        }

        const deltaFz = (m * curA * h) / L;
        const fzFront = Fz_static_front + deltaFz;
        const fzRear = Math.max(0, Fz_static_rear - deltaFz);

        const slipF = !isBraking ? 0.01 : Math.min(0.20, 0.08 + (curA / 10) * 0.08);
        const slipR = !isBraking ? 0.01 : (rearControlPct > 80 && inst.vehicle.brakeBiasRatio > 0.35 ? 0.95 : Math.min(0.25, 0.06 + (rearControlPct / 100) * 0.12));

        distance.push(curX);
        velocity.push(curV);
        deceleration.push(curA);
        omega.push(curV / inst.vehicle.wheelRadius);
        slipRatioFront.push(slipF);
        slipRatioRear.push(slipR);
        normalLoadFront.push(fzFront);
        normalLoadRear.push(fzRear);
        rotorTemperature.push(inst.simulation.initialRotorTemp + (isBraking ? ((curT - t_rxn) / t_brake) * 85.0 : 0));
      }

      const rearLift = normalLoadRear.some(v => v <= 0.01);
      const washout = inst.environment.contaminant === 'wet' && slipRatioFront.some(s => s > 0.18);

      const terminalOutcome: TerminalOutcome = isCollision
        ? 'Barrier Collision'
        : rearLift
        ? 'Rear-Wheel Lift-off'
        : washout
        ? 'Front-Wheel Washout'
        : 'Safe Stop';

      const peakFrontPress = Number(((frontLeverPct / 100) * 6.5).toFixed(1)); // MPa
      const peakRearPress = Number(((rearControlPct / 100) * 5.0).toFixed(1));  // MPa

      return {
        instanceId: inst.id,
        terminalOutcome,
        stoppingDistance: stopDist,
        stoppingTime: stopTime,
        peakDeceleration: avgDecel,
        finalVelocity,
        maxRotorTemp: inst.simulation.initialRotorTemp + (isCollision ? (stopTime / t_total) * 85.0 : 85.0),
        reactionDistance: d_rxn,
        mechanicalBrakingDistance: d_brake,
        peakFrontLeverPct: frontLeverPct,
        peakRearControlPct: rearControlPct,
        peakFrontPressureMpa: peakFrontPress,
        peakRearPressureMpa: peakRearPress,
        rearLiftOffOccurred: rearLift,
        frontWashoutOccurred: washout,
        fluidBoilOccurred: false,
        telemetry: {
          time,
          distance,
          velocity,
          deceleration,
          omega,
          slipRatioFront,
          slipRatioRear,
          normalLoadFront,
          normalLoadRear,
          rotorTemperature
        }
      };
    });

    this.activeResults.set(results);
    this.isLoading.set(false);
  }
}
