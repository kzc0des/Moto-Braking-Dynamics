import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DiagnosticsService } from './diagnostics.service';
import { BenchmarkStore } from '../../state/benchmark.store';

@Component({
  selector: 'app-diagnostics-hud',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- HUD Floating Toggle Badge -->
    <div class="fixed bottom-3 right-3 z-50">
      <button
        type="button"
        (click)="diagnostics.toggleHud()"
        class="px-3 py-1.5 bg-slate-900 border text-xs font-mono font-bold rounded-xs shadow-lg flex items-center gap-2 transition-colors"
        [ngClass]="
          diagnostics.errors().length > 0
            ? 'border-rose-500 text-rose-400 bg-rose-950/40 animate-pulse'
            : 'border-slate-700 text-slate-300 hover:text-amber-400 hover:border-amber-400'
        "
      >
        <span class="w-2 h-2 rounded-full" [ngClass]="diagnostics.errors().length > 0 ? 'bg-rose-500' : 'bg-emerald-500'"></span>
        <span>DIAGNOSTICS HUD</span>
        @if (diagnostics.metrics(); as m) {
          <span class="text-[10px] text-slate-400">({{ m.roundtripLatencyMs }}ms)</span>
        }
      </button>
    </div>

    <!-- Collapsible Diagnostics Drawer -->
    @if (diagnostics.isHudOpen()) {
      <div class="fixed bottom-12 right-3 w-120 max-w-[90vw] max-h-96 bg-slate-950 border border-slate-700 rounded-sm shadow-2xl z-50 flex flex-col font-mono text-xs overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
          <span class="font-bold text-slate-100 flex items-center gap-2">
            <span>DIAGNOSTICS & STATE INSPECTOR</span>
            @if (diagnostics.metrics(); as m) {
              <span class="px-1.5 py-0.2 text-[10px] bg-slate-800 text-amber-400 rounded-xs">
                {{ m.solverExecutionTimeMs }}ms SOLVER
              </span>
            }
          </span>
          <button
            type="button"
            (click)="diagnostics.toggleHud()"
            class="text-slate-400 hover:text-slate-100 font-bold px-1"
          >
            ✕
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <!-- Warnings & Physical Limits -->
          @if (store.activeWarnings().length > 0) {
            <div class="p-2 bg-amber-950/30 border border-amber-500/40 rounded-xs">
              <span class="text-amber-400 font-bold">PHYSICAL SAFEGUARD WARNINGS:</span>
              <ul class="list-disc list-inside mt-1 text-[11px] text-amber-300">
                @for (warn of store.activeWarnings(); track warn) {
                  <li>{{ warn }}</li>
                }
              </ul>
            </div>
          }

          <!-- Errors Log -->
          @if (diagnostics.errors().length > 0) {
            <div class="p-2 bg-rose-950/40 border border-rose-500/50 rounded-xs flex flex-col gap-1">
              <div class="flex items-center justify-between">
                <span class="text-rose-400 font-bold">HTTP / RUNTIME ERRORS:</span>
                <button
                  type="button"
                  (click)="diagnostics.clearErrors()"
                  class="text-[10px] text-rose-300 hover:underline"
                >
                  Clear
                </button>
              </div>
              @for (err of diagnostics.errors(); track err.timestamp) {
                <div class="text-[10px] text-rose-200 border-t border-rose-900/50 pt-1">
                  <span class="text-slate-400">[{{ err.timestamp }}]</span> {{ err.message }}
                </div>
              }
            </div>
          }

          <!-- Solver Performance Metrics -->
          @if (diagnostics.metrics(); as m) {
            <div class="grid grid-cols-2 gap-2 text-[11px]">
              <div class="p-2 bg-slate-900 rounded-xs">
                <div class="text-slate-400">Network Latency:</div>
                <div class="text-slate-200 font-bold">{{ m.roundtripLatencyMs }} ms</div>
              </div>
              <div class="p-2 bg-slate-900 rounded-xs">
                <div class="text-slate-400">SciPy Solver Runtime:</div>
                <div class="text-amber-400 font-bold">{{ m.solverExecutionTimeMs }} ms</div>
              </div>
            </div>
          }

          <!-- State Snapshot Inspection -->
          <div class="p-2 bg-slate-900 rounded-xs flex flex-col gap-1">
            <span class="text-slate-300 font-semibold text-[11px]">ACTIVE INSTANCES STATE:</span>
            <div class="text-[10px] text-slate-400">
              Enabled: {{ store.enabledInstances().length }} / 3 | Scrub Time: {{ store.scrubTime().toFixed(2) }}s
            </div>
            <details class="text-[10px]">
              <summary class="text-amber-400 cursor-pointer hover:underline">View Raw Request Payload</summary>
              <pre class="mt-1 p-2 bg-slate-950 rounded text-slate-300 overflow-x-auto max-h-32 text-[9px]">{{ diagnostics.rawRequestPayload() | json }}</pre>
            </details>
          </div>
        </div>
      </div>
    }
  `
})
export class DiagnosticsHudComponent {
  readonly diagnostics = inject(DiagnosticsService);
  readonly store = inject(BenchmarkStore);
}
