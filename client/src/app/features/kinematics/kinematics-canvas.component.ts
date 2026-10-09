import { Component, ElementRef, viewChild, inject, afterNextRender, signal, effect, OnDestroy, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { TrackRenderer } from './renderers/track.renderer';
import { VehicleRenderer } from './renderers/vehicle.renderer';

export type ViewportHeight = 'hero' | 'immersive' | 'full';

@Component({
  selector: 'app-kinematics-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="relative w-full bg-slate-950 border border-slate-800 rounded-sm overflow-hidden shadow-lg flex flex-col"
      [ngClass]="isTelemetryCollapsed() ? 'h-full flex-1 min-h-0' : ''"
    >
      <!-- High-Precision Telemetry & Viewport Toolbar -->
      <div class="flex flex-wrap items-center justify-between px-3.5 py-2 bg-[#121926] border-b border-[#232f42] text-xs font-mono gap-2 shrink-0">
        <div class="flex items-center gap-2.5">
          <span class="w-2.5 h-2.5 bg-amber-400 rounded-xs"></span>
          <span class="text-slate-100 font-bold tracking-wider">2D KINEMATICS TRACK VIEWPORT</span>
          <span class="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded-xs border border-slate-700">
            60 FPS SOLVER REPLAY
          </span>
          <!-- Idle Mode Toggle Button -->
          <button
            type="button"
            (click)="isIdleMode.set(!isIdleMode())"
            class="flex items-center gap-1.5 px-2 py-0.5 rounded-xs border text-[11px] font-mono font-bold transition-all"
            [style.borderColor]="isIdleMode() ? store.selectedInstance().colorAccent : 'rgba(71, 85, 105, 0.6)'"
            [style.backgroundColor]="isIdleMode() ? store.selectedInstance().colorAccent + '20' : 'rgba(15, 23, 42, 0.7)'"
            [style.color]="isIdleMode() ? store.selectedInstance().colorAccent : '#94a3b8'"
            title="Toggle Idle Mode to inspect stationary engine and rider breathing animation"
          >
            <span class="w-1.5 h-1.5 rounded-full" [style.backgroundColor]="isIdleMode() ? store.selectedInstance().colorAccent : '#64748b'"></span>
            <span>{{ isIdleMode() ? 'IDLE: ON' : 'IDLE: OFF' }}</span>
          </button>
        </div>

        <div class="flex items-center gap-3 text-slate-300">
          <div class="flex items-center gap-1.5">
            <span class="text-slate-500">T:</span>
            <span class="text-amber-400 font-bold tabular-nums">{{ store.scrubTime().toFixed(2) }}s</span>
            <span class="text-slate-600">/ {{ store.maxRunTime().toFixed(2) }}s</span>
            <button
              type="button"
              (click)="store.resetPlayback()"
              class="ml-1 px-1.5 py-0.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xs border border-slate-700 text-[10px] font-mono transition-colors cursor-pointer"
              title="Reset to starting line (t = 0.00s)"
            >
              ↺ RESET
            </button>
          </div>

          <div class="hidden sm:flex items-center gap-1.5">
            <span class="text-slate-500">HAZARD:</span>
            <span class="text-rose-400 font-bold tabular-nums">{{ store.selectedInstance().simulation.hazardDistance }}m</span>
          </div>

          <!-- Vehicle Archetype Selector Pills matching sprite colors -->
          <div class="hidden md:flex items-center gap-1">
            @for (inst of store.instances(); track inst.id) {
              <button
                type="button"
                (click)="store.setSelectedInstanceId(inst.id)"
                class="flex items-center gap-1.5 px-2 py-0.5 rounded-xs border text-[11px] font-mono transition-all"
                [style.borderColor]="store.selectedInstanceId() === inst.id ? inst.colorAccent : 'rgba(51, 65, 85, 0.6)'"
                [style.backgroundColor]="store.selectedInstanceId() === inst.id ? inst.colorAccent + '20' : 'rgba(15, 23, 42, 0.6)'"
                [style.color]="store.selectedInstanceId() === inst.id ? inst.colorAccent : '#94a3b8'"
                [title]="'Select ' + inst.name"
              >
                <img
                  [src]="'sprites/' + (inst.spriteKey || (inst.name.toLowerCase().includes('scooter') ? 'scooter' : inst.name.toLowerCase().includes('cruiser') ? 'cruiser' : 'ninja')) + '_idle_preview.gif'"
                  class="w-4 h-3 object-contain"
                  [alt]="inst.name"
                />
                <span class="font-bold">{{ inst.name.split(' ')[0] }}</span>
              </button>
            }
          </div>

          <!-- Viewport Height Scale Toggles / Fullscreen Indicator -->
          @if (!isTelemetryCollapsed()) {
            <div class="flex items-center border border-slate-700 rounded-xs overflow-hidden text-[11px]">
              <button
                type="button"
                (click)="heightMode.set('hero')"
                class="px-2 py-0.5 transition-colors"
                [ngClass]="heightMode() === 'hero' ? 'bg-amber-500/20 text-amber-300 font-bold border-r border-slate-700' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-r border-slate-700'"
                title="Standard Viewport Height (440px)"
              >
                440px
              </button>
              <button
                type="button"
                (click)="heightMode.set('immersive')"
                class="px-2 py-0.5 transition-colors"
                [ngClass]="heightMode() === 'immersive' ? 'bg-amber-500/20 text-amber-300 font-bold border-r border-slate-700' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border-r border-slate-700'"
                title="Immersive Hill Climb Racing Viewport (560px)"
              >
                560px
              </button>
              <button
                type="button"
                (click)="heightMode.set('full')"
                class="px-2 py-0.5 transition-colors"
                [ngClass]="heightMode() === 'full' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'bg-slate-900 text-slate-400 hover:text-slate-200'"
                title="Full Stage Viewport (700px)"
              >
                700px
              </button>
            </div>
          } @else {
            <div class="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 border border-amber-500/40 rounded-xs text-[11px] text-amber-300 font-mono font-bold">
              <span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              <span>100dvh TOTAL SCREEN VIEWPORT</span>
            </div>
          }
        </div>
      </div>

      <!-- Main Canvas Container -->
      <div
        class="relative w-full bg-[#070a10] overflow-hidden transition-all duration-300"
        [ngClass]="{
          'flex-1 min-h-0 h-full': isTelemetryCollapsed(),
          'h-[440px]': !isTelemetryCollapsed() && heightMode() === 'hero',
          'h-[560px]': !isTelemetryCollapsed() && heightMode() === 'immersive',
          'h-[700px]': !isTelemetryCollapsed() && heightMode() === 'full'
        }"
      >
        <canvas
          #canvas
          (click)="onCanvasClick($event)"
          (mousemove)="onCanvasMouseMove($event)"
          (mousedown)="onCanvasMouseDown($event)"
          (mouseup)="onCanvasMouseUp()"
          class="w-full h-full block cursor-crosshair select-none"
        ></canvas>

        <!-- Floating Scrubber Position Bar Overlay Indicator -->
        <div class="absolute bottom-2 left-4 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-1 rounded-xs border border-slate-800 pointer-events-none">
          CLICK OR DRAG HORIZONTALLY TO SCRUB TRAJECTORY
        </div>
      </div>
    </div>
  `
})
export class KinematicsCanvasComponent implements OnDestroy {
  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly store = inject(BenchmarkStore);
  readonly isTelemetryCollapsed = input<boolean>(false);
  readonly heightMode = signal<ViewportHeight>('immersive');
  readonly isIdleMode = signal<boolean>(false);

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

    const width = canvas.width;
    const height = canvas.height;
    if (width === 0 || height === 0) return;

    const maxDist = this.store.maxStoppingDistance();
    const selectedInst = this.store.selectedInstance();
    const hazardDist = selectedInst.simulation.hazardDistance;
    const enabledInsts = this.store.enabledInstances();
    const frames = this.store.scrubFrames();

    // 1. Render Track
    this.trackRenderer.render({
      ctx,
      width,
      height,
      maxDistance: maxDist,
      hazardDistance: hazardDist,
      numLanes: Math.max(1, enabledInsts.length),
      roadGradeAngle: selectedInst.environment.roadGradeAngle,
      pothole: selectedInst.environment.potholeEnabled ? selectedInst.environment.pothole : undefined
    });

    // 2. Render Vehicles on Lanes
    const laneHeight = height / Math.max(1, enabledInsts.length);
    const isPaused = !this.store.isPlaying();

    enabledInsts.forEach((inst, idx) => {
      const frame = frames[inst.id];
      if (!frame) return;

      const shouldIdle = this.isIdleMode() || isPaused || frame.velocity <= 0.08;
      const renderFrame = this.isIdleMode()
        ? { ...frame, distance: 0, velocity: 0, deceleration: 0 }
        : isPaused
        ? { ...frame, velocity: 0, deceleration: 0 }
        : frame;

      this.vehicleRenderer.render({
        ctx,
        laneY: idx * laneHeight,
        laneHeight,
        width,
        maxDistance: maxDist,
        colorAccent: inst.colorAccent,
        name: inst.name,
        spriteKey: inst.spriteKey,
        forceIdle: shouldIdle,
        animTime: performance.now() / 1000,
        frame: renderFrame
      });
    });
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

  onCanvasClick(event: MouseEvent): void {
    this.seekFromEvent(event);
  }

  private seekFromEvent(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const paddingLeft = 90;
    const paddingRight = 60;
    const trackWidth = rect.width - paddingLeft - paddingRight;

    if (clickX >= paddingLeft && clickX <= rect.width - paddingRight) {
      const frac = Math.max(0, Math.min(1, (clickX - paddingLeft) / trackWidth));
      const targetDist = frac * this.store.maxStoppingDistance();
      const res = this.store.activeResults().find(r => r.instanceId === this.store.selectedInstanceId());
      if (res && res.telemetry) {
        const dists = res.telemetry.distance;
        const times = res.telemetry.time;
        for (let i = 0; i < dists.length; i++) {
          if (dists[i] >= targetDist) {
            this.store.setScrubTime(times[i]);
            return;
          }
        }
        if (times.length > 0) {
          this.store.setScrubTime(times[times.length - 1]);
        }
      }
    }
  }
}
