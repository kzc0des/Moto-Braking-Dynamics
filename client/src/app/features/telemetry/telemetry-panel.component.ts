import { Component, ElementRef, viewChild, inject, afterNextRender, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { StripChartRenderer } from './renderers/strip-chart.renderer';

@Component({
  selector: 'app-telemetry-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-white border border-[#E6DFD3] rounded-xl shadow-xs p-4 flex flex-col gap-3.5 select-none">
      <!-- Top Header: Title & Channel Toggles -->
      <div class="flex items-center justify-between pb-1 border-b border-[#E6DFD3]/60">
        <div class="font-bold text-[#22201E] text-base">Synchronized telemetry</div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="showLoads.set(!showLoads())"
            class="px-3 py-1 text-xs font-medium border rounded-md transition-colors cursor-pointer"
            [ngClass]="showLoads() ? 'bg-[#FDEBE8] text-[#C93A30] border-[#F2554A]' : 'bg-white text-[#6B645C] border-[#E6DFD3] hover:text-[#22201E]'"
          >
            Normal loads
          </button>
          <button
            type="button"
            (click)="showThermals.set(!showThermals())"
            class="px-3 py-1 text-xs font-medium border rounded-md transition-colors cursor-pointer"
            [ngClass]="showThermals() ? 'bg-[#FDEBE8] text-[#C93A30] border-[#F2554A]' : 'bg-white text-[#6B645C] border-[#E6DFD3] hover:text-[#22201E]'"
          >
            Brake temp
          </button>
        </div>
      </div>

      <!-- Primary Charts: Velocity (Left) & Deceleration (Right) Side-by-Side -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Chart 1: Velocity -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs px-1">
            <span class="text-[#6B645C]">Velocity (m/s)</span>
            <span class="font-bold text-[#22201E] text-sm tabular-nums">{{ currentVelocity().toFixed(1) }}</span>
          </div>
          <div class="w-full h-32 rounded-lg overflow-hidden border border-[#E6DFD3]">
            <canvas #canvasVelocity class="w-full h-full block"></canvas>
          </div>
        </div>

        <!-- Chart 2: Deceleration -->
        <div class="flex flex-col gap-1.5">
          <div class="flex items-center justify-between text-xs px-1">
            <span class="text-[#6B645C]">Deceleration (m/s²)</span>
            <span class="font-bold text-[#22201E] text-sm tabular-nums">{{ currentDeceleration().toFixed(1) }}</span>
          </div>
          <div class="w-full h-32 rounded-lg overflow-hidden border border-[#E6DFD3]">
            <canvas #canvasDecel class="w-full h-full block"></canvas>
          </div>
        </div>
      </div>

      <!-- Optional Strip 3: Normal Loads (Front & Rear Fz) -->
      @if (showLoads()) {
        <div class="flex flex-col gap-1.5 pt-2 border-t border-[#E6DFD3]/60">
          <div class="flex items-center justify-between text-xs px-1">
            <span class="text-[#6B645C]">Normal load distribution (Front: Coral, Rear: Ink) (N)</span>
            <span class="font-bold text-[#22201E] text-sm tabular-nums">
              F: {{ (currentFrontLoad() / 1000).toFixed(2) }} kN · R: {{ (currentRearLoad() / 1000).toFixed(2) }} kN
            </span>
          </div>
          <div class="w-full h-28 rounded-lg overflow-hidden border border-[#E6DFD3]">
            <canvas #canvasLoads class="w-full h-full block"></canvas>
          </div>
        </div>
      }

      <!-- Optional Strip 4: Brake Rotor Temperature -->
      @if (showThermals()) {
        <div class="flex flex-col gap-1.5 pt-2 border-t border-[#E6DFD3]/60">
          <div class="flex items-center justify-between text-xs px-1">
            <span class="text-[#6B645C]">Rotor temperature (°C)</span>
            <span class="font-bold text-[#22201E] text-sm tabular-nums">{{ currentRotorTemp().toFixed(1) }} °C</span>
          </div>
          <div class="w-full h-28 rounded-lg overflow-hidden border border-[#E6DFD3]">
            <canvas #canvasThermals class="w-full h-full block"></canvas>
          </div>
        </div>
      }
    </div>
  `
})
export class TelemetryPanelComponent implements OnDestroy {
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

    // 1. Velocity Canvas (Coral curve --series-1 / #F2554A)
    const cVel = this.canvasVelocityRef()?.nativeElement;
    if (cVel) {
      const ctx = cVel.getContext('2d');
      if (ctx && cVel.width > 0 && cVel.height > 0) {
        this.renderer.render({
          ctx,
          width: cVel.width,
          height: cVel.height,
          curves: [
            { name: 'Velocity', color: '#F2554A', times: telem.time, values: telem.velocity, unit: ' m/s' }
          ],
          maxTime: maxT,
          scrubTime: scrubT,
          yMin: 0
        });
      }
    }

    // 2. Deceleration Canvas (Ink curve --series-2 / #2E2C33)
    const cDec = this.canvasDecelRef()?.nativeElement;
    if (cDec) {
      const ctx = cDec.getContext('2d');
      if (ctx && cDec.width > 0 && cDec.height > 0) {
        this.renderer.render({
          ctx,
          width: cDec.width,
          height: cDec.height,
          curves: [
            { name: 'Decel', color: '#2E2C33', times: telem.time, values: telem.deceleration, unit: ' m/s²' }
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
            { name: 'Front Fz', color: '#F2554A', times: telem.time, values: telem.normalLoadFront, unit: ' N' },
            { name: 'Rear Fz', color: '#2E2C33', times: telem.time, values: telem.normalLoadRear, unit: ' N' }
          ],
          maxTime: maxT,
          scrubTime: scrubT,
          yMin: 0
        });
      }
    }

    // 4. Rotor Temperature Canvas (if shown)
    const cThermals = this.canvasThermalsRef()?.nativeElement;
    if (cThermals && this.showThermals()) {
      const ctx = cThermals.getContext('2d');
      if (ctx && cThermals.width > 0 && cThermals.height > 0) {
        this.renderer.render({
          ctx,
          width: cThermals.width,
          height: cThermals.height,
          curves: [
            { name: 'Rotor Temp', color: '#F2554A', times: telem.time, values: telem.rotorTemperature, unit: ' °C' }
          ],
          maxTime: maxT,
          scrubTime: scrubT,
          yMin: 20
        });
      }
    }
  }
}
