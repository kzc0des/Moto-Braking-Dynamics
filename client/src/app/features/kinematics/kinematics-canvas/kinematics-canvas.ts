import { Component, ElementRef, viewChild, inject, afterNextRender, signal, computed, OnDestroy, HostListener } from '@angular/core';
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

  readonly liveStatusText = computed(() => {
    const f = this.liveFrame();
    if (!f) return 'Idle at Start';
    if (f.velocity <= 0.08) return 'Standstill / Stopped';
    return 'Decelerating (Brakes Applied)';
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
  }

  handlePlay(): void {
    if (this.isAtEnd()) {
      this.handleReset();
      this.store.togglePlay();
    } else {
      this.store.togglePlay();
    }
  }

  handleReset(): void {
    this.store.resetPlayback();
    const container = this.trackScrollContainerRef()?.nativeElement;
    if (container) {
      container.scrollLeft = 0;
    }
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

    // Render single track
    this.trackRenderer.render({
      ctx,
      width,
      height,
      maxDistance: maxDist,
      hazardDistance: hazardDist,
      numLanes: 1,
      roadGradeAngle: roadGrade,
      pothole: this.activeInst().environment.potholeEnabled ? pothole : undefined
    });

    // Render vehicle
    const frame = scrubFrames[selectedId];
    if (frame) {
      this.vehicleRenderer.render({
        ctx,
        laneY,
        laneHeight,
        width,
        maxDistance: maxDist,
        colorAccent: this.activeInst().colorAccent,
        name: this.activeInst().name,
        spriteKey: this.activeInst().spriteKey,
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
