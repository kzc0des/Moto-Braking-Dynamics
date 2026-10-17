import { Component, ElementRef, viewChild, inject, afterNextRender, signal, model, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../../state/benchmark.store';
import { StripChartRenderer } from '../renderers/strip-chart.renderer';

@Component({
  selector: 'app-telemetry-panel',
  imports: [CommonModule],
  templateUrl: './telemetry-panel.html',
  styleUrl: './telemetry-panel.css'
})
export class TelemetryPanel implements OnDestroy {
  readonly store = inject(BenchmarkStore);
  readonly isOpen = model<boolean>(false);
  readonly activeTooltip = signal<string | null>(null);

  readonly canvasVelocityRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasVelocity');
  readonly canvasDecelRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasDecel');
  readonly canvasLoadsRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasLoads');
  readonly canvasThermalsRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasThermals');

  private readonly renderer = new StripChartRenderer();
  private resizeObserver?: ResizeObserver;
  private animFrameId?: number;

  constructor() {
    afterNextRender(() => {
      this.setupCanvases();
      this.startRenderLoop();
    });
  }

  toggleOpen(): void {
    this.isOpen.set(!this.isOpen());
    setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
      this.drawAll();
    }, 50);
  }

  toggleTooltip(id: string): void {
    if (this.activeTooltip() === id) {
      this.activeTooltip.set(null);
    } else {
      this.activeTooltip.set(id);
    }
  }

  closeTooltip(): void {
    this.activeTooltip.set(null);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  currentVelocity(): number {
    const frame = this.store.scrubFrames()[this.store.selectedInstanceId()];
    return frame ? frame.velocity : 0;
  }

  currentDeceleration(): number {
    const frame = this.store.scrubFrames()[this.store.selectedInstanceId()];
    return frame ? frame.deceleration : 0;
  }

  currentFrontLoad(): number {
    const frame = this.store.scrubFrames()[this.store.selectedInstanceId()];
    return frame ? frame.normalLoadFront : 0;
  }

  currentRearLoad(): number {
    const frame = this.store.scrubFrames()[this.store.selectedInstanceId()];
    return frame ? frame.normalLoadRear : 0;
  }

  currentRotorTemp(): number {
    const frame = this.store.scrubFrames()[this.store.selectedInstanceId()];
    return frame ? frame.rotorTemperature : 20;
  }

  isAbsActive(): boolean {
    const frame = this.store.scrubFrames()[this.store.selectedInstanceId()];
    return !!(frame?.absActiveFront || frame?.absActiveRear);
  }

  isRearLockup(): boolean {
    const frame = this.store.scrubFrames()[this.store.selectedInstanceId()];
    if (!frame) return false;
    return frame.slipRatioRear > 0.85;
  }

  private setupCanvases(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.drawAll();
    });

    const c1 = this.canvasVelocityRef()?.nativeElement;
    const c2 = this.canvasDecelRef()?.nativeElement;
    const c3 = this.canvasLoadsRef()?.nativeElement;
    const c4 = this.canvasThermalsRef()?.nativeElement;
    if (c1) this.resizeObserver.observe(c1);
    if (c2) this.resizeObserver.observe(c2);
    if (c3) this.resizeObserver.observe(c3);
    if (c4) this.resizeObserver.observe(c4);
  }

  private ensureCanvasSize(c: HTMLCanvasElement): { width: number; height: number; dpr: number } | null {
    const rect = c.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const dpr = window.devicePixelRatio || 1;
    const targetW = Math.floor(rect.width * dpr);
    const targetH = Math.floor(rect.height * dpr);

    if (c.width !== targetW || c.height !== targetH) {
      c.width = targetW;
      c.height = targetH;
    }
    return { width: rect.width, height: rect.height, dpr };
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.drawAll();
      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private drawAll(): void {
    const results = this.store.activeResults();
    if (results.length === 0) return;

    const maxT = this.store.maxRunTime();
    const scrubT = this.store.scrubTime();
    const selId = this.store.selectedInstanceId();
    const activeRes = results.find(r => r.instanceId === selId) ?? results[0];
    if (!activeRes?.telemetry) return;

    const telem = activeRes.telemetry;

    // 1. Velocity Canvas (--info / #2B6CB0)
    const cVel = this.canvasVelocityRef()?.nativeElement;
    if (cVel) {
      const dim = this.ensureCanvasSize(cVel);
      if (dim) {
        const ctx = cVel.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dim.dpr, dim.dpr);
          this.renderer.render({
            ctx,
            width: dim.width,
            height: dim.height,
            curves: [
              { name: 'Velocity', color: '#2B6CB0', times: telem.time, values: telem.velocity, unit: ' m/s' }
            ],
            maxTime: maxT,
            scrubTime: scrubT,
            yMin: 0
          });
          ctx.restore();
        }
      }
    }

    // 2. Deceleration Canvas (Asphalt ink #1F2328)
    const cDec = this.canvasDecelRef()?.nativeElement;
    if (cDec) {
      const dim = this.ensureCanvasSize(cDec);
      if (dim) {
        const ctx = cDec.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dim.dpr, dim.dpr);
          this.renderer.render({
            ctx,
            width: dim.width,
            height: dim.height,
            curves: [
              { name: 'Decel', color: '#1F2328', times: telem.time, values: telem.deceleration, unit: ' m/s²' }
            ],
            maxTime: maxT,
            scrubTime: scrubT,
            yMin: 0
          });
          ctx.restore();
        }
      }
    }

    // 3. Normal Loads Canvas (Fixated)
    const cLoads = this.canvasLoadsRef()?.nativeElement;
    if (cLoads) {
      const dim = this.ensureCanvasSize(cLoads);
      if (dim) {
        const ctx = cLoads.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dim.dpr, dim.dpr);
          this.renderer.render({
            ctx,
            width: dim.width,
            height: dim.height,
            curves: [
              { name: 'Front Fz', color: '#E8750F', times: telem.time, values: telem.normalLoadFront, unit: ' N' },
              { name: 'Rear Fz', color: '#2B6CB0', times: telem.time, values: telem.normalLoadRear, unit: ' N' }
            ],
            thresholds: [
              { value: 0, label: 'Lift-Off Limit (0 N)', color: '#D93A32', dashed: true }
            ],
            maxTime: maxT,
            scrubTime: scrubT,
            yMin: 0
          });
          ctx.restore();
        }
      }
    }

    // 4. Rotor Temperature Canvas (Fixated)
    const cThermals = this.canvasThermalsRef()?.nativeElement;
    if (cThermals) {
      const dim = this.ensureCanvasSize(cThermals);
      if (dim) {
        const ctx = cThermals.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dim.dpr, dim.dpr);
          this.renderer.render({
            ctx,
            width: dim.width,
            height: dim.height,
            curves: [
              { name: 'Rotor Temp', color: '#D93A32', times: telem.time, values: telem.rotorTemperature, unit: ' °C' }
            ],
            thresholds: [
              { value: 230, label: 'Boil Limit (230°C)', color: '#D93A32', dashed: true }
            ],
            maxTime: maxT,
            scrubTime: scrubT,
            yMin: 20,
            yMax: 260
          });
          ctx.restore();
        }
      }
    }
  }
}
