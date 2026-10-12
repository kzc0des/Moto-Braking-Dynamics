import { Injectable, inject, signal, computed, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, catchError, tap } from 'rxjs/operators';
import { BenchmarkInstanceConfig, VehicleSpriteKey } from '../core/models/benchmark.types';
import { DEFAULT_SUPERBIKE, DEFAULT_CRUISER, DEFAULT_SCOOTER } from '../core/models/archetype-defaults';
import { InstanceSimulationResult, InterpolatedScrubFrame, BenchmarkResponse } from '../core/models/telemetry.types';
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
          this.generateLocalFallbackResults();
          return of(null);
        }

        this.isLoading.set(true);
        const startTime = performance.now();
        const payload = { instances: enabled };

        return this.api.runBenchmark(payload).pipe(
          tap((response: BenchmarkResponse) => {
            const latency = Math.round(performance.now() - startTime);
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
            console.warn('[BenchmarkStore] Simulation API error, falling back to local approximation:', err);
            this.generateLocalFallbackResults();
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

          return {
            ...inst,
            name: custom.title || `${custom.displacementCc}cc Custom ${custom.category}`,
            enabled: true,
            spriteKey: spriteKey,
            vehicle: {
              ...inst.vehicle,
              mass: custom.massKg,
              wheelbase: custom.wheelbase,
              cogHeight: custom.cogHeight,
              cogDistanceFront: cogFront,
              cogDistanceRear: cogRear,
              brakeBiasRatio: custom.rearBrake === 'drum' ? 0.35 : 0.30
            },
            brake: {
              ...inst.brake,
              brakeType: custom.rearBrake === 'drum' ? 'drum' : 'disc',
              rotorMass: custom.rotorDiameterMm > 280 ? 1.6 : 1.2,
              effectiveRadius: Number((custom.rotorDiameterMm / 2000).toFixed(3)),
              padFrictionNominal: custom.padFriction,
              fluidBoilTemperature: custom.fluidBoilTemp
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
      terminalOutcome
    };
  }

  // --- Local Fallback Generator (Ensures UI works even if backend is offline) ---
  private generateLocalFallbackResults(): void {
    const results: InstanceSimulationResult[] = this.enabledInstances().map(inst => {
      const N = 150;
      const v0 = inst.simulation.initialVelocity;
      const m = inst.vehicle.mass;
      const L = inst.vehicle.wheelbase;
      const h = inst.vehicle.cogHeight;
      const mu = inst.environment.substrate === 'gravel' ? 0.45 : inst.environment.contaminant === 'wet' ? 0.60 : 0.88;
      const avgDecel = Math.min(mu * 9.81 * (inst.actuation.type === 'sudden_lockup' ? 0.75 : 0.95), 11.5);
      const stopTime = Math.max(1.0, v0 / avgDecel);
      const stopDist = 0.5 * avgDecel * stopTime * stopTime;

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

        const frac = curT / stopTime;
        const curV = Math.max(0, v0 * (1 - frac));
        const curA = frac >= 1 ? 0 : avgDecel;
        const curX = v0 * curT - 0.5 * avgDecel * curT * curT;

        const deltaFz = (m * curA * h) / L;
        const fzFront = Fz_static_front + deltaFz;
        const fzRear = Math.max(0, Fz_static_rear - deltaFz);

        const slipF = inst.actuation.type === 'sudden_lockup' ? Math.min(0.85, 0.15 + frac * 0.7) : 0.12 + Math.sin(frac * Math.PI) * 0.03;
        const slipR = inst.actuation.type === 'sudden_lockup' ? 0.95 : 0.08 + frac * 0.04;

        distance.push(curX);
        velocity.push(curV);
        deceleration.push(curA);
        omega.push(curV / inst.vehicle.wheelRadius);
        slipRatioFront.push(slipF);
        slipRatioRear.push(slipR);
        normalLoadFront.push(fzFront);
        normalLoadRear.push(fzRear);
        rotorTemperature.push(inst.simulation.initialRotorTemp + frac * 85.0);
      }

      const rearLift = normalLoadRear.some(v => v <= 0.01);
      const collision = stopDist > inst.simulation.hazardDistance;
      const washout = inst.actuation.type === 'sudden_lockup' && inst.environment.contaminant === 'wet';

      const terminalOutcome = washout
        ? 'Front-Wheel Washout'
        : collision
        ? 'Barrier Collision'
        : rearLift
        ? 'Rear-Wheel Lift-off'
        : 'Safe Stop';

      return {
        instanceId: inst.id,
        terminalOutcome,
        stoppingDistance: stopDist,
        stoppingTime: stopTime,
        peakDeceleration: avgDecel,
        finalVelocity: collision ? v0 * 0.3 : 0,
        maxRotorTemp: inst.simulation.initialRotorTemp + 85.0,
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
  }
}
