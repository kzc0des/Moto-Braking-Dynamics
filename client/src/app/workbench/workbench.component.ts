import { Component, inject, signal, HostListener } from '@angular/core';
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
    <div class="min-h-screen bg-[#0b0f17] text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      <!-- Top Application Header -->
      <header class="flex items-center justify-between px-4 py-2 bg-[#151c28] border-b border-[#232f42] text-xs font-mono">
        <div class="flex items-center gap-3">
          <div class="flex items-center gap-2">
            <span class="w-3 h-3 bg-amber-400 rounded-xs"></span>
            <span class="text-sm font-bold tracking-wider text-slate-100">MOTO-BRAKING DYNAMICS</span>
          </div>
          <span class="text-slate-500">|</span>
          <span class="text-slate-400 hidden sm:inline">COMPUTATIONAL BENCHMARK WORKBENCH</span>
        </div>

        <div class="flex items-center gap-2.5">
          <!-- Solver Status Indicator -->
          <div class="hidden md:flex items-center gap-1.5 text-[11px] mr-1">
            <span
              class="w-2 h-2 rounded-full"
              [ngClass]="store.isLoading() ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'"
            ></span>
            <span class="text-slate-400">{{ store.isLoading() ? 'SOLVING ODE...' : 'STANDBY' }}</span>
          </div>

          <!-- Configuration Drawer Trigger Button -->
          <button
            type="button"
            (click)="toggleConfigDrawer()"
            class="px-2.5 py-1 bg-slate-900 border rounded-xs transition-colors flex items-center gap-2"
            [ngClass]="
              isConfigDrawerOpen()
                ? 'border-amber-400 bg-amber-950/40 text-amber-300 font-bold'
                : 'border-slate-700 text-slate-300 hover:text-white hover:border-slate-500'
            "
            title="Open Configuration Drawer (Esc to close)"
          >
            <span class="w-2 h-2 rounded-full" [style.backgroundColor]="store.selectedInstance().colorAccent"></span>
            <span class="font-bold">⚙ CONFIGURATION</span>
            <span class="text-[10px] text-slate-400 hidden lg:inline">({{ store.selectedInstance().name }})</span>
          </button>

          <!-- Telemetry Toggle Button -->
          <button
            type="button"
            (click)="isTelemetryCollapsed.set(!isTelemetryCollapsed())"
            class="px-2 py-1 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white rounded-xs transition-colors text-[11px]"
            title="Toggle Telemetry Panel"
          >
            {{ isTelemetryCollapsed() ? '+ TELEMETRY' : '— TELEMETRY' }}
          </button>

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
      <main class="flex-1 p-3 flex flex-col gap-3 max-w-[1840px] w-full mx-auto">
        <!-- Row 1: 2D Kinematics Track Viewport & Minimizable Anatomy Inspector -->
        <div class="flex flex-col lg:flex-row gap-3 items-stretch w-full">
          <!-- 2D Kinematics Track Viewport (expands smoothly when anatomy is minimized) -->
          <div class="flex-1 min-w-0 transition-all duration-300">
            <app-kinematics-canvas />
          </div>

          <!-- Interactive Anatomy Inspector (beside it, minimizable) -->
          <div
            class="transition-all duration-300 shrink-0"
            [ngClass]="isAnatomyMinimized() ? 'w-full lg:w-12' : 'w-full lg:w-[380px]'"
          >
            <app-anatomy-inspector
              [isMinimized]="isAnatomyMinimized()"
              (toggleMinimize)="isAnatomyMinimized.set(!isAnatomyMinimized())"
            />
          </div>
        </div>

        <!-- Row 2: Synchronized Telemetry Strips (Collapsible) -->
        @if (!isTelemetryCollapsed()) {
          <div class="w-full transition-all duration-300">
            <app-telemetry-panel />
          </div>
        }
      </main>

      <!-- Configuration Slide-over Drawer -->
      @if (isConfigDrawerOpen()) {
        <!-- Backdrop Overlay -->
        <div
          (click)="isConfigDrawerOpen.set(false)"
          class="fixed inset-0 bg-black/60 z-40 backdrop-blur-xs transition-opacity"
        ></div>
      }

      <div
        class="fixed inset-y-0 right-0 z-50 w-full sm:w-[640px] lg:w-[780px] bg-[#0c1017] border-l border-[#232f42] shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out font-mono select-none"
        [class.translate-x-0]="isConfigDrawerOpen()"
        [class.translate-x-full]="!isConfigDrawerOpen()"
      >
        <!-- Drawer Header -->
        <div class="flex items-center justify-between px-4 py-3 bg-[#131b28] border-b border-[#232f42]">
          <div class="flex items-center gap-2.5">
            <span class="w-3 h-3 bg-amber-400 rounded-xs"></span>
            <div>
              <div class="text-sm font-bold text-slate-100">SYSTEM CONFIGURATION COCKPIT</div>
              <div class="text-[10px] text-slate-400">VEHICLE, ROADWAY & ACTUATION PARAMETER CONTROL</div>
            </div>
          </div>
          <button
            type="button"
            (click)="isConfigDrawerOpen.set(false)"
            class="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-amber-400 rounded-xs text-xs font-bold transition-colors"
          >
            ✕ ESC
          </button>
        </div>

        <!-- Drawer Scrollable Body -->
        <div class="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">
          <app-parameter-cockpit />
        </div>

        <!-- Drawer Footer -->
        <div class="px-4 py-2.5 bg-[#131b28] border-t border-[#232f42] flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-slate-400 text-[11px]">
            <span
              class="w-2 h-2 rounded-full"
              [ngClass]="store.isLoading() ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'"
            ></span>
            <span>{{ store.isLoading() ? 'SOLVER COMPUTING...' : 'REAL-TIME SYNCHRONIZED' }}</span>
          </div>
          <button
            type="button"
            (click)="isConfigDrawerOpen.set(false)"
            class="px-4 py-1.5 bg-amber-500/20 border border-amber-500/50 text-amber-300 hover:bg-amber-500/30 rounded-xs font-bold transition-colors"
          >
            DONE
          </button>
        </div>
      </div>

      <!-- Floating Right Edge Drawer Trigger Tab -->
      <button
        type="button"
        (click)="toggleConfigDrawer()"
        class="fixed top-1/2 -right-1 transform -translate-y-1/2 z-30 px-2 py-3 bg-slate-900 border border-slate-700 hover:border-amber-400 text-slate-300 hover:text-amber-400 rounded-l-xs shadow-xl flex flex-col items-center gap-1.5 text-[10px] font-mono font-bold transition-all hover:pr-3 cursor-pointer"
        title="Open System Configuration Drawer"
      >
        <span>⚙</span>
        <span class="[writing-mode:vertical-lr] rotate-180 uppercase tracking-widest text-[9px] text-slate-400">CONFIG</span>
      </button>

      <!-- Fixed Diagnostics HUD Floating Anchor -->
      <app-diagnostics-hud />
    </div>
  `
})
export class WorkbenchComponent {
  readonly store = inject(BenchmarkStore);
  readonly theme = inject(ThemeService);

  readonly isConfigDrawerOpen = signal<boolean>(false);
  readonly isAnatomyMinimized = signal<boolean>(false);
  readonly isTelemetryCollapsed = signal<boolean>(false);

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isConfigDrawerOpen()) {
      this.isConfigDrawerOpen.set(false);
    }
  }

  toggleConfigDrawer(): void {
    this.isConfigDrawerOpen.set(!this.isConfigDrawerOpen());
  }
}
