import { Component, ElementRef, viewChild, inject, afterNextRender, effect, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { StripChartRenderer, ChartCurve, ThresholdLine } from './renderers/strip-chart.renderer';
import { TrajectoryScrubberComponent } from './trajectory-scrubber.component';

@Component({
  selector: 'app-telemetry-panel',
  standalone: true,
  imports: [CommonModule, TrajectoryScrubberComponent],
  template: `
    <div class="flex flex-col gap-2 p-3 bg-slate-950 border border-slate-800 rounded-sm">
      <!-- Trajectory Scrubber -->
      <app-trajectory-scrubber />

      <!-- Channel Toggle Toolbar -->
      <div class="flex items-center justify-between text-xs font-mono text-slate-400 py-0.5">
        <span class="font-semibold text-slate-300">SYNCHRONIZED TELEMETRY STRIPS</span>
        <div class="flex items-center gap-1.5">
          <button
            type="button"
            (click)="showLoads.set(!showLoads())"
            class="px-2 py-0.5 border rounded-xs transition-colors"
            [ngClass]="showLoads() ? 'bg-cyan-950/40 text-cyan-400 border-cyan-500/50' : 'bg-slate-900 text-slate-500 border-slate-800'"
          >
            {{ showLoads() ? '✓ Normal Loads' : '+ Normal Loads' }}
          </button>
          <button
            type="button"
            (click)="showThermals.set(!showThermals())"
            class="px-2 py-0.5 border rounded-xs transition-colors"
            [ngClass]="showThermals() ? 'bg-rose-950/40 text-rose-400 border-rose-500/50' : 'bg-slate-900 text-slate-500 border-slate-800'"
          >
            {{ showThermals() ? '✓ Brake Temp' : '+ Brake Temp' }}
          </button>
        </div>
      </div>

      <!-- Strip 1: Kinematics (v & a) -->
      <canvas #canvasKinematics class="w-full h-28 block border border-slate-900 rounded-xs"></canvas>

      <!-- Strip 2: Traction & Slip (κ) -->
      <canvas #canvasSlip class="w-full h-28 block border border-slate-900 rounded-xs"></canvas>

      <!-- Strip 3: Dynamic Normal Loads (F_z) -->
      @if (showLoads()) {
        <canvas #canvasLoads class="w-full h-28 block border border-slate-900 rounded-xs"></canvas>
      }

      <!-- Strip 4: Thermodynamics (T_rotor) -->
      @if (showThermals()) {
        <canvas #canvasThermals class="w-full h-28 block border border-slate-900 rounded-xs"></canvas>
      }
    </div>
  `
})
export class TelemetryPanelComponent implements OnDestroy {
  readonly store = inject(BenchmarkStore);
  readonly showLoads = signal<boolean>(false);
  readonly showThermals = signal<boolean>(false);

  readonly canvasKinematicsRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasKinematics');
  readonly canvasSlipRef = viewChild<ElementRef<HTMLCanvasElement>>('canvasSlip');
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

  private setupCanvases(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.resizeAll();
      this.drawAll();
    });

    const c1 = this.canvasKinematicsRef()?.nativeElement;
    if (c1) this.resizeObserver.observe(c1);

    this.resizeAll();
  }

  private resizeAll(): void {
    const list = [
      this.canvasKinematicsRef()?.nativeElement,
      this.canvasSlipRef()?.nativeElement,
      this.canvasLoadsRef()?.nativeElement,
      this.canvasThermalsRef()?.nativeElement
    ].filter(Boolean) as HTMLCanvasElement[];

    const dpr = window.devicePixelRatio || 1;
    list.forEach(c => {
      const rect = c.getBoundingClientRect();
      c.width = Math.floor(rect.width * dpr);
      c.height = Math.floor(rect.height * dpr);
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

    // 1. Kinematics Canvas
    const cKin = this.canvasKinematicsRef()?.nativeElement;
    if (cKin) {
      const ctx = cKin.getContext('2d');
      if (ctx) {
        this.renderer.render({
          ctx,
          width: cKin.width,
          height: cKin.height,
          title: 'VELOCITY (m/s) & DECELERATION (m/s²)',
          curves: [
            { name: 'Velocity', color: '#fbbf24', times: telem.time, values: telem.velocity, unit: ' m/s' },
            { name: 'Decel', color: '#06b6d4', times: telem.time, values: telem.deceleration, unit: ' m/s²' }
          ],
          maxTime: maxT,
          scrubTime: scrubT,
          yMin: 0
        });
      }
    }

    // 2. Slip Canvas
    const cSlip = this.canvasSlipRef()?.nativeElement;
    if (cSlip) {
      const ctx = cSlip.getContext('2d');
      if (ctx) {
        this.renderer.render({
          ctx,
          width: cSlip.width,
          height: cSlip.height,
          title: 'WHEEL SLIP RATIO (κ)',
          curves: [
            { name: 'Front Slip', color: '#fbbf24', times: telem.time, values: telem.slipRatioFront, unit: '' },
            { name: 'Rear Slip', color: '#06b6d4', times: telem.time, values: telem.slipRatioRear, unit: '' }
          ],
          thresholds: [
            { value: 0.15, label: 'κ_crit (15%)', color: '#f43f5e', dashed: true }
          ],
          maxTime: maxT,
          scrubTime: scrubT,
          yMin: 0,
          yMax: 1.0
        });
      }
    }

    // 3. Normal Loads Canvas
    if (this.showLoads()) {
      const cLoad = this.canvasLoadsRef()?.nativeElement;
      if (cLoad) {
        const ctx = cLoad.getContext('2d');
        if (ctx) {
          this.renderer.render({
            ctx,
            width: cLoad.width,
            height: cLoad.height,
            title: 'DYNAMIC NORMAL LOADS F_z (N)',
            curves: [
              { name: 'Front Fz', color: '#fbbf24', times: telem.time, values: telem.normalLoadFront, unit: ' N' },
              { name: 'Rear Fz', color: '#06b6d4', times: telem.time, values: telem.normalLoadRear, unit: ' N' }
            ],
            thresholds: [
              { value: 0.0, label: 'Lift-Off (0 N)', color: '#f43f5e', dashed: true }
            ],
            maxTime: maxT,
            scrubTime: scrubT,
            yMin: 0
          });
        }
      }
    }

    // 4. Rotor Thermals Canvas
    if (this.showThermals()) {
      const cTherm = this.canvasThermalsRef()?.nativeElement;
      if (cTherm) {
        const ctx = cTherm.getContext('2d');
        if (ctx) {
          this.renderer.render({
            ctx,
            width: cTherm.width,
            height: cTherm.height,
            title: 'ROTOR TEMPERATURE (°C)',
            curves: [
              { name: 'Rotor Temp', color: '#f43f5e', times: telem.time, values: telem.rotorTemperature, unit: ' °C' }
            ],
            thresholds: [
              { value: 250, label: 'Fade Onset (250°C)', color: '#fbbf24', dashed: true },
              { value: 230, label: 'Fluid Boil (230°C)', color: '#06b6d4', dashed: true }
            ],
            maxTime: maxT,
            scrubTime: scrubT,
            yMin: 20
          });
        }
      }
    }
  }
}
