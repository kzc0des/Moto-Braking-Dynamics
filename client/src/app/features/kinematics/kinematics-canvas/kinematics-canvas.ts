import { Component, ElementRef, viewChild, inject, afterNextRender, signal, computed, effect, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../../state/benchmark.store';
import { TrackRenderer } from '../renderers/track.renderer';
import { VehicleRenderer } from '../renderers/vehicle.renderer';

@Component({
  selector: 'app-kinematics-canvas',
  imports: [CommonModule],
  host: {
    class: 'block w-full h-full flex-1 min-h-0 flex flex-col'
  },
  templateUrl: './kinematics-canvas.html',
  styleUrl: './kinematics-canvas.css'
})
export class KinematicsCanvas implements OnDestroy {
  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly trackScrollContainerRef = viewChild<ElementRef<HTMLDivElement>>('trackScrollContainer');
  readonly store = inject(BenchmarkStore);

  readonly activeInst = computed(() => this.store.selectedInstance());

  readonly liveFrame = computed(() => {
    const id = this.activeInst().id;
    return this.store.scrubFrames()[id];
  });

  readonly liveSpeedKmh = computed(() => {
    const f = this.liveFrame();
    return f ? (f.velocity * 3.6).toFixed(1) : (this.activeInst().simulation.initialVelocity * 3.6).toFixed(1);
  });

  readonly distanceToBarrierM = computed(() => {
    const f = this.liveFrame();
    const x = f ? f.distance : 0;
    return Math.max(0, this.activeInst().simulation.hazardDistance - x).toFixed(1);
  });

  readonly barrierProgressPct = computed(() => {
    const f = this.liveFrame();
    const x = f ? f.distance : 0;
    const X = this.activeInst().simulation.hazardDistance;
    return X > 0 ? Math.min(100, Math.max(0, (x / X) * 100)) : 0;
  });

  readonly liveDistanceM = computed(() => {
    const f = this.liveFrame();
    return f ? f.distance.toFixed(1) : '0.0';
  });

  readonly liveDecelG = computed(() => {
    const f = this.liveFrame();
    return f ? (f.deceleration / 9.81).toFixed(2) : '0.00';
  });

  readonly liveTempC = computed(() => {
    const f = this.liveFrame();
    return f ? Math.round(f.rotorTemperature) : Math.round(this.activeInst().simulation.initialRotorTemp);
  });

  readonly activeResult = computed(() => {
    const id = this.activeInst().id;
    return this.store.activeResults().find(r => r.instanceId === id);
  });

  readonly frontLeverPct = computed(() => this.activeInst().actuation.frontLeverPct ?? 85);
  readonly rearControlPct = computed(() => this.activeInst().actuation.rearControlPct ?? 65);
  readonly rearControlLabel = computed(() => {
    const key = this.activeInst().spriteKey;
    return (key === 'scooter' || key === 'maxi') ? 'Left Hand Lever' : 'Right Foot Pedal';
  });

  readonly peakDecelG = computed(() => {
    const res = this.activeResult();
    return res ? (res.peakDeceleration / 9.81).toFixed(2) : '0.72';
  });

  readonly terminalOutcome = computed(() => {
    return this.activeResult()?.terminalOutcome ?? 'Safe Stop';
  });

  readonly isCollisionOrCrash = computed(() => {
    const out = this.terminalOutcome();
    return out === 'Barrier Collision' || out === 'Front-Wheel Washout' || out === 'Rear-Wheel Lift-off';
  });

  readonly collisionDeficitM = computed(() => {
    const res = this.activeResult();
    if (!res) return '0.0';
    const deficit = (res.reactionDistance ?? 0) + (res.mechanicalBrakingDistance ?? 0) - this.activeInst().simulation.hazardDistance;
    return deficit > 0 ? deficit.toFixed(1) : '0.0';
  });

  readonly impactSpeedKmh = computed(() => {
    const res = this.activeResult();
    return res ? (res.finalVelocity * 3.6).toFixed(1) : '0.0';
  });

  readonly reactionDistM = computed(() => {
    const res = this.activeResult();
    return res?.reactionDistance ? res.reactionDistance.toFixed(1) : '16.7';
  });

  readonly mechanicalBrakingDistM = computed(() => {
    const res = this.activeResult();
    return res?.mechanicalBrakingDistance ? res.mechanicalBrakingDistance.toFixed(1) : '19.6';
  });

  readonly isIncidentModalOpen = signal<boolean>(false);
  private hasShownIncidentModalForRun = false;

  readonly isStagedAtStart = computed(() => {
    return this.store.scrubTime() <= 0.05 && !this.store.isPlaying();
  });

  readonly isCollisionReached = computed(() => {
    const f = this.liveFrame();
    if (!f) return false;
    const isAtHazard = f.distance >= this.activeInst().simulation.hazardDistance - 0.25;
    return (this.isCollisionOrCrash() && isAtHazard) || (this.isAtEnd() && this.isCollisionOrCrash());
  });

  readonly liveStatusText = computed(() => {
    const f = this.liveFrame();
    if (!f || this.isStagedAtStart()) return 'READY · press Launch Run below to start';
    if (this.isCollisionReached()) {
      return 'FAILED: BARRIER COLLISION';
    }
    if (f.velocity <= 0.08) return 'Standstill / Safe Stop';
    if (f.isBrakingActive === false) return 'Reaction Delay (1.0s Free-Roll)';
    return 'Active Deceleration (Brakes Clamped)';
  });

  readonly liveStatusDotClass = computed(() => {
    if (this.isStagedAtStart()) return 'bg-[var(--line-deep)] animate-pulse';
    if (this.isCollisionReached()) return 'bg-[var(--danger-fill)] animate-ping';
    const f = this.liveFrame();
    if (f && f.velocity <= 0.08) return 'bg-[var(--ok)]';
    return 'bg-[var(--line)]';
  });

  readonly liveStatusTextClass = computed(() => {
    if (this.isCollisionReached()) return 'text-[var(--danger)] font-bold';
    const f = this.liveFrame();
    if (f && f.velocity <= 0.08) return 'text-[var(--ok-ink)] font-bold';
    return 'text-[var(--ink)] font-semibold';
  });

  readonly isAtEnd = computed(() => {
    return this.store.scrubTime() >= this.store.maxRunTime() - 0.05;
  });

  @HostListener('window:keydown.space', ['$event'])
  onSpacebar(event: Event): void {
    const target = event.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
      return;
    }
    event.preventDefault();
    this.handlePlay();
  }

  private readonly trackRenderer = new TrackRenderer();
  private readonly vehicleRenderer = new VehicleRenderer();
  private resizeObserver?: ResizeObserver;
  private animFrameId?: number;
  private isDragging = false;

  constructor() {
    afterNextRender(() => {
      this.setupCanvas();
      this.startRenderLoop();
    });

    // Reset incident shown flag whenever staged at start line or updating instance
    effect(() => {
      const t = this.store.scrubTime();
      this.activeInst();
      if (t <= 0.05) {
        this.hasShownIncidentModalForRun = false;
      }
    });
  }

  handlePlay(): void {
    if (this.isAtEnd()) {
      this.handleReset();
      this.store.togglePlay();
    } else {
      if (this.isIncidentModalOpen()) {
        this.isIncidentModalOpen.set(false);
      }
      this.store.togglePlay();
    }
  }

  handleReset(): void {
    this.store.resetPlayback();
    this.hasShownIncidentModalForRun = false;
    this.isIncidentModalOpen.set(false);
    const container = this.trackScrollContainerRef()?.nativeElement;
    if (container) {
      container.scrollLeft = 0;
    }
  }

  closeIncidentModal(): void {
    this.isIncidentModalOpen.set(false);
  }

  openIncidentModal(): void {
    this.isIncidentModalOpen.set(true);
  }

  replayFromModal(): void {
    this.isIncidentModalOpen.set(false);
    this.handleReset();
    this.store.togglePlay();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private setupCanvas(): void {
    const canvas = this.canvasRef().nativeElement;
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeCanvas();
      this.drawFrame();
    });
    this.resizeObserver.observe(canvas);
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
    }
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (this.store.isPlaying()) {
        const dt = 0.016 * this.store.playbackSpeed();
        const nextT = this.store.scrubTime() + dt;
        if (nextT >= this.store.maxRunTime()) {
          this.store.setScrubTime(this.store.maxRunTime());
          this.store.pause();
          if (this.isCollisionOrCrash() && !this.hasShownIncidentModalForRun) {
            this.isIncidentModalOpen.set(true);
            this.hasShownIncidentModalForRun = true;
          }
        } else {
          this.store.setScrubTime(nextT);
        }
      }
      this.drawFrame();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private drawFrame(): void {
    const canvas = this.canvasRef().nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const maxDist = Math.max(70, this.activeInst().simulation.hazardDistance * 1.25);
    const scrubFrames = this.store.scrubFrames();
    const selectedId = this.activeInst().id;
    const roadGrade = this.activeInst().environment.roadGradeAngle;
    const pothole = this.activeInst().environment.pothole;
    const hazardDist = this.activeInst().simulation.hazardDistance;

    const topOffset = 26;
    const laneHeight = height - topOffset;
    const laneY = topOffset;

    // Render single track with perception-reaction demarcation and collision failure callout
    this.trackRenderer.render({
      ctx,
      width,
      height,
      maxDistance: maxDist,
      hazardDistance: hazardDist,
      reactionDistance: this.activeResult()?.reactionDistance,
      isCollision: this.isCollisionReached(),
      impactVelocityKmh: this.isCollisionReached() ? Math.round(Number(this.impactSpeedKmh())) : undefined,
      numLanes: 1,
      roadGradeAngle: roadGrade,
      pothole: this.activeInst().environment.potholeEnabled ? pothole : undefined
    });

    // Render vehicle
    const frame = scrubFrames[selectedId];
    if (frame) {
      const isAtStart = this.store.scrubTime() <= 0.05;
      const isPlaying = this.store.isPlaying();
      const isStopped = frame.velocity <= 0.08;
      const forceIdle = (isAtStart && !isPlaying) || isStopped;

      this.vehicleRenderer.render({
        ctx,
        laneY,
        laneHeight,
        width,
        maxDistance: maxDist,
        colorAccent: this.activeInst().colorAccent,
        name: this.activeInst().name,
        spriteKey: this.activeInst().spriteKey,
        forceIdle,
        animTime: typeof performance !== 'undefined' ? performance.now() / 1000 : undefined,
        frame
      });
    }

    ctx.restore();
  }

  onCanvasClick(event: MouseEvent): void {
    this.seekFromEvent(event);
  }

  onCanvasMouseDown(event: MouseEvent): void {
    this.isDragging = true;
    this.seekFromEvent(event);
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (this.isDragging) {
      this.seekFromEvent(event);
    }
  }

  onCanvasMouseUp(): void {
    this.isDragging = false;
  }

  private seekFromEvent(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const trackStartX = 60;
    const trackEndX = rect.width - 40;
    const ratio = Math.max(0, Math.min(1, (x - trackStartX) / (trackEndX - trackStartX)));
    this.store.setScrubTime(ratio * this.store.maxRunTime());
  }
}
