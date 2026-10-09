import { Component, ElementRef, viewChild, inject, afterNextRender, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { TrackRenderer } from './renderers/track.renderer';
import { VehicleRenderer } from './renderers/vehicle.renderer';

@Component({
  selector: 'app-kinematics-canvas',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative w-full bg-slate-950 border border-slate-800 rounded-sm overflow-hidden shadow-md">
      <div class="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs font-mono">
        <span class="text-slate-200 font-semibold tracking-wide">2D KINEMATICS TRACK VIEWPORT</span>
        <div class="flex items-center gap-3 text-slate-400">
          <span>TIME: <span class="text-amber-400 font-bold tabular-nums">{{ store.scrubTime().toFixed(2) }}s</span></span>
          <span>HAZARD: <span class="text-rose-400 font-bold tabular-nums">{{ store.selectedInstance().simulation.hazardDistance }}m</span></span>
        </div>
      </div>
      <canvas
        #canvas
        (click)="onCanvasClick($event)"
        class="w-full h-48 block cursor-crosshair"
      ></canvas>
    </div>
  `
})
export class KinematicsCanvasComponent implements OnDestroy {
  readonly canvasRef = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly store = inject(BenchmarkStore);

  private readonly trackRenderer = new TrackRenderer();
  private readonly vehicleRenderer = new VehicleRenderer();
  private resizeObserver?: ResizeObserver;
  private animFrameId?: number;

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
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
  }

  private startRenderLoop(): void {
    const loop = () => {
      if (this.store.isPlaying()) {
        const dt = 0.016 * this.store.playbackSpeed();
        const nextT = this.store.scrubTime() + dt;
        if (nextT >= this.store.maxRunTime()) {
          this.store.setScrubTime(0);
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
    const maxDist = this.store.maxStoppingDistance();
    const hazardDist = this.store.selectedInstance().simulation.hazardDistance;
    const enabledInsts = this.store.enabledInstances();
    const frames = this.store.scrubFrames();

    // 1. Render Track
    this.trackRenderer.render({
      ctx,
      width,
      height,
      maxDistance: maxDist,
      hazardDistance: hazardDist,
      numLanes: Math.max(1, enabledInsts.length)
    });

    // 2. Render Vehicles on Lanes
    const laneHeight = height / Math.max(1, enabledInsts.length);
    enabledInsts.forEach((inst, idx) => {
      const frame = frames[inst.id];
      if (!frame) return;

      this.vehicleRenderer.render({
        ctx,
        laneY: idx * laneHeight,
        laneHeight,
        width,
        maxDistance: maxDist,
        colorAccent: inst.colorAccent,
        name: inst.name,
        frame
      });
    });
  }

  onCanvasClick(event: MouseEvent): void {
    const canvas = this.canvasRef().nativeElement;
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const paddingLeft = 40;
    const paddingRight = 40;
    const trackWidth = rect.width - paddingLeft - paddingRight;

    if (clickX >= paddingLeft && clickX <= rect.width - paddingRight) {
      const frac = (clickX - paddingLeft) / trackWidth;
      const targetDist = frac * this.store.maxStoppingDistance();
      // Estimate time from distance for selected instance
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
      }
    }
  }
}
