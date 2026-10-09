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
        class="px-3.5 py-2 bg-white border border-[#E6DFD3] hover:border-[#F2554A] text-[#22201E] text-xs sm:text-sm font-mono font-bold rounded-lg shadow-md flex items-center gap-2 transition-colors cursor-pointer"
        [ngClass]="
          diagnostics.errors().length > 0
            ? 'border-[#F2554A] text-[#C93A30] bg-[#FDEBE8]'
            : ''
        "
      >
        <span class="w-2.5 h-2.5 rounded-full" [ngClass]="diagnostics.errors().length > 0 ? 'bg-[#F2554A]' : 'bg-[#2F9E6B]'"></span>
        <span>DIAGNOSTICS HUD</span>
        @if (diagnostics.metrics(); as m) {
          <span class="text-xs text-[#6B645C] font-normal">({{ m.roundtripLatencyMs }}ms)</span>
        }
      </button>
    </div>

    <!-- Collapsible Diagnostics Drawer -->
    @if (diagnostics.isHudOpen()) {
      <div class="fixed bottom-12 right-3 w-128 max-w-[90vw] max-h-96 bg-white border border-[#E6DFD3] rounded-xl shadow-2xl z-50 flex flex-col font-mono text-xs overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between px-3.5 py-2.5 bg-[#FAF7F2] border-b border-[#E6DFD3]">
          <span class="font-bold text-[#22201E] flex items-center gap-2 text-sm">
            <span>DIAGNOSTICS & STATE INSPECTOR</span>
            @if (diagnostics.metrics(); as m) {
              <span class="px-2 py-0.5 text-xs bg-[#F3EEE6] text-[#22201E] rounded-md font-semibold border border-[#E6DFD3]">
                {{ m.solverExecutionTimeMs }}ms SOLVER
              </span>
            }
          </span>
          <button
            type="button"
            (click)="diagnostics.toggleHud()"
            class="text-[#6B645C] hover:text-[#22201E] font-bold px-1.5 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">
          <!-- Warnings & Physical Limits -->
          @if (store.activeWarnings().length > 0) {
            <div class="p-2.5 bg-[#FEF7EC] border border-[#E0A030]/60 rounded-lg">
              <span class="text-[#B87A14] font-bold text-xs sm:text-sm">PHYSICAL SAFEGUARD WARNINGS:</span>
              <ul class="list-disc list-inside mt-1.5 text-xs text-[#8A5B0B] space-y-0.5">
                @for (warn of store.activeWarnings(); track warn) {
                  <li>{{ warn }}</li>
                }
              </ul>
            </div>
          }

          <!-- Errors Log -->
          @if (diagnostics.errors().length > 0) {
            <div class="p-2.5 bg-[#FDEBE8] border border-[#F2554A]/60 rounded-lg flex flex-col gap-1.5">
              <div class="flex items-center justify-between">
                <span class="text-[#C93A30] font-bold text-xs sm:text-sm">HTTP / RUNTIME ERRORS:</span>
                <button
                  type="button"
                  (click)="diagnostics.clearErrors()"
                  class="text-xs text-[#C93A30] hover:underline font-semibold cursor-pointer"
                >
                  Clear
                </button>
              </div>
              @for (err of diagnostics.errors(); track err.timestamp) {
                <div class="text-xs text-[#C93A30] border-t border-[#F2554A]/20 pt-1">
                  <span class="text-[#6B645C]">[{{ err.timestamp }}]</span> {{ err.message }}
                </div>
              }
            </div>
          }

          <!-- Solver Performance Metrics -->
          @if (diagnostics.metrics(); as m) {
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div class="p-2.5 bg-[#FAF7F2] border border-[#E6DFD3] rounded-lg">
                <div class="text-[#6B645C] font-medium">Network Latency:</div>
                <div class="text-[#22201E] font-bold text-sm">{{ m.roundtripLatencyMs }} ms</div>
              </div>
              <div class="p-2.5 bg-[#FAF7F2] border border-[#E6DFD3] rounded-lg">
                <div class="text-[#6B645C] font-medium">SciPy Solver Runtime:</div>
                <div class="text-[#F2554A] font-bold text-sm">{{ m.solverExecutionTimeMs }} ms</div>
              </div>
            </div>
          }

          <!-- State Snapshot Inspection -->
          <div class="p-2.5 bg-[#FAF7F2] border border-[#E6DFD3] rounded-lg flex flex-col gap-1.5">
            <span class="text-[#22201E] font-semibold text-xs">ACTIVE INSTANCES STATE:</span>
            <div class="text-xs text-[#6B645C]">
              Enabled: {{ store.enabledInstances().length }} / 3 | Scrub Time: {{ store.scrubTime().toFixed(2) }}s
            </div>
            <details class="text-xs">
              <summary class="text-[#F2554A] hover:text-[#C93A30] cursor-pointer hover:underline font-medium">View Raw Request Payload</summary>
              <pre class="mt-1 p-2 bg-[#F3EEE6] border border-[#E6DFD3] rounded text-[#22201E] overflow-x-auto max-h-32 text-xs font-mono">{{ diagnostics.rawRequestPayload() | json }}</pre>
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
