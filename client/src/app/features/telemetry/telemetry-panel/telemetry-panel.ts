import { Component, ElementRef, viewChild, inject, afterNextRender, signal, OnDestroy } from '@angular/core';
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
  readonly showLoads = signal<boolean>(false);
  readonly showThermals = signal<boolean>(false);

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

  private setupCanvases(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeAll();
      this.drawAll();
    });

    const c1 = this.canvasVelocityRef()?.nativeElement;
    if (c1) this.resizeObserver.observe(c1);

    this.resizeAll();
  }

  private resizeAll(): void {
    const list = [
      this.canvasVelocityRef()?.nativeElement,
      this.canvasDecelRef()?.nativeElement,
      this.canvasLoadsRef()?.nativeElement,
      this.canvasThermalsRef()?.nativeElement
    ].filter(Boolean) as HTMLCanvasElement[];

    const dpr = window.devicePixelRatio || 1;
    list.forEach(c => {
      const rect = c.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        c.width = Math.floor(rect.width * dpr);
        c.height = Math.floor(rect.height * dpr);
      }
    });
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
      const ctx = cVel.getContext('2d');
      if (ctx && cVel.width > 0 && cVel.height > 0) {
        this.renderer.render({
          ctx,
          width: cVel.width,
          height: cVel.height,
          curves: [
            { name: 'Velocity', color: '#2B6CB0', times: telem.time, values: telem.velocity, unit: ' m/s' }
          ],
          maxTime: maxT,
          scrubTime: scrubT,
          yMin: 0
        });
      }
    }

    // 2. Deceleration Canvas (Asphalt ink #1F2328)
    const cDec = this.canvasDecelRef()?.nativeElement;
    if (cDec) {
      const ctx = cDec.getContext('2d');
      if (ctx && cDec.width > 0 && cDec.height > 0) {
        this.renderer.render({
          ctx,
          width: cDec.width,
          height: cDec.height,
          curves: [
            { name: 'Decel', color: '#1F2328', times: telem.time, values: telem.deceleration, unit: ' m/s²' }
          ],
          maxTime: maxT,
          scrubTime: scrubT,
          yMin: 0
        });
      }
    }

    // 3. Normal Loads Canvas (if shown)
    const cLoads = this.canvasLoadsRef()?.nativeElement;
    if (cLoads && this.showLoads()) {
      const ctx = cLoads.getContext('2d');
      if (ctx && cLoads.width > 0 && cLoads.height > 0) {
        this.renderer.render({
          ctx,
          width: cLoads.width,
          height: cLoads.height,
          curves: [
            { name: 'Front Fz', color: '#E8750F', times: telem.time, values: telem.normalLoadFront, unit: ' N' },
            { name: 'Rear Fz', color: '#2B6CB0', times: telem.time, values: telem.normalLoadRear, unit: ' N' }
          ],
          maxTime: maxT,
          scrubTime: scrubT,
          yMin: 0
        });
      }
    }

    // 4. Rotor Temperature Canvas (if shown: physical danger heat #D93A32)
    const cThermals = this.canvasThermalsRef()?.nativeElement;
    if (cThermals && this.showThermals()) {
      const ctx = cThermals.getContext('2d');
      if (ctx && cThermals.width > 0 && cThermals.height > 0) {
        this.renderer.render({
          ctx,
          width: cThermals.width,
          height: cThermals.height,
          curves: [
            { name: 'Rotor Temp', color: '#D93A32', times: telem.time, values: telem.rotorTemperature, unit: ' °C' }
          ],
          maxTime: maxT,
          scrubTime: scrubT,
          yMin: 20
        });
      }
    }
  }
}
