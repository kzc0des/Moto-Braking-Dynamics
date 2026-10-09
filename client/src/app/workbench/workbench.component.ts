import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../state/benchmark.store';
import { ThemeService } from '../core/services/theme.service';
import { KinematicsCanvasComponent } from '../features/kinematics/kinematics-canvas.component';
import { AnatomyInspectorComponent } from '../features/anatomy/anatomy-inspector.component';
import { TelemetryPanelComponent } from '../features/telemetry/telemetry-panel.component';
import { ParameterCockpitComponent } from '../features/parameters/parameter-cockpit.component';
import { DiagnosticsHudComponent } from '../features/diagnostics/diagnostics-hud.component';

@Component({
  selector: 'app-workbench',
  standalone: true,
  imports: [
    CommonModule,
    KinematicsCanvasComponent,
    AnatomyInspectorComponent,
    TelemetryPanelComponent,
    ParameterCockpitComponent,
    DiagnosticsHudComponent
  ],
  template: `
    <div class="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans select-none">
      <!-- Top Application Header -->
      <header class="flex items-center justify-between px-4 py-2.5 bg-[#151c28] border-b border-[#232f42] text-xs font-mono">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 bg-amber-400 rounded-xs"></span>
            <span class="text-sm font-bold tracking-wider text-slate-100">MOTO-BRAKING DYNAMICS</span>
          </div>
          <span class="text-slate-500">|</span>
          <span class="text-slate-400 hidden sm:inline">COMPUTATIONAL BENCHMARK WORKBENCH</span>
        </div>

        <div class="flex items-center gap-3">
          <!-- Solver Status Indicator -->
          <div class="flex items-center gap-1.5 text-[11px]">
            <span
              class="w-2 h-2 rounded-full"
              [ngClass]="store.isLoading() ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'"
            ></span>
            <span class="text-slate-400">{{ store.isLoading() ? 'SOLVING ODE...' : 'STANDBY' }}</span>
          </div>

          <!-- Theme Toggle -->
          <button
            type="button"
            (click)="theme.toggleTheme()"
            class="px-2 py-1 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white rounded-xs transition-colors"
          >
            {{ theme.currentTheme() === 'dark' ? '☀ LIGHT' : '🌙 DARK' }}
          </button>
        </div>
      </header>

      <!-- Main Workbench Layout -->
      <main class="flex-1 p-3 flex flex-col gap-3 max-w-[1720px] w-full mx-auto">
        <!-- Row 1: Kinematics Track Viewport & Anatomy Inspector -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div class="lg:col-span-2">
            <app-kinematics-canvas />
          </div>
          <div class="lg:col-span-1">
            <app-anatomy-inspector />
          </div>
        </div>

        <!-- Row 2: Synchronized Telemetry Strips -->
        <div>
          <app-telemetry-panel />
        </div>

        <!-- Row 3: Parameter Cockpit -->
        <div>
          <app-parameter-cockpit />
        </div>
      </main>

      <!-- Fixed Diagnostics HUD Floating Anchor -->
      <app-diagnostics-hud />
    </div>
  `
})
export class WorkbenchComponent {
  readonly store = inject(BenchmarkStore);
  readonly theme = inject(ThemeService);
}
