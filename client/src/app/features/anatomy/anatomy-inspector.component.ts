import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { LedSlipBarComponent } from '../../shared/ui/led-slip-bar.component';
import { OutcomeBadgeComponent } from '../../shared/ui/outcome-badge.component';

@Component({
  selector: 'app-anatomy-inspector',
  standalone: true,
  imports: [CommonModule, LedSlipBarComponent, OutcomeBadgeComponent],
  template: `
    <div class="flex flex-col gap-2 p-3 bg-slate-950 border border-slate-800 rounded-sm">
      <div class="flex items-center justify-between text-xs font-mono">
        <span class="text-slate-300 font-semibold">INTERACTIVE ANATOMY INSPECTOR</span>
        @if (currentFrame(); as frame) {
          <app-outcome-badge [outcome]="frame.terminalOutcome" />
        }
      </div>

      <!-- 2D SVG Schematic -->
      <div class="relative w-full h-40 bg-slate-900 border border-slate-800 rounded-xs flex items-center justify-center p-2">
        <svg viewBox="0 0 320 160" class="w-full h-full">
          <!-- Ground line -->
          <line x1="20" y1="135" x2="300" y2="135" stroke="#334155" stroke-width="2" />

          <!-- Rear Wheel (x: 80, y: 110, r: 25) -->
          <circle cx="80" cy="110" r="25" fill="#0b0f17" stroke="#06b6d4" stroke-width="2.5" />
          <circle cx="80" cy="110" r="6" fill="#06b6d4" />
          <!-- Rear Brake Caliper/Disc -->
          <circle cx="80" cy="110" r="14" fill="none" stroke="#64748b" stroke-width="1.5" stroke-dasharray="3,3" />

          <!-- Front Wheel (x: 240, y: 110, r: 25) -->
          <circle cx="240" cy="110" r="25" fill="#0b0f17" stroke="#fbbf24" stroke-width="2.5" />
          <circle cx="240" cy="110" r="6" fill="#fbbf24" />
          <!-- Front Brake Caliper/Disc -->
          <circle cx="240" cy="110" r="16" fill="none" stroke="#f43f5e" stroke-width="2" stroke-dasharray="4,2" />

          <!-- Chassis Main Triangle -->
          <!-- Swingarm -->
          <line x1="80" y1="110" x2="150" y2="95" stroke="#94a3b8" stroke-width="3" />
          <!-- Main Frame Spars -->
          <polygon points="150,95 215,65 160,50" fill="#1e293b" stroke="#cbd5e1" stroke-width="2" />
          <!-- Front Fork -->
          <line x1="215" y1="65" x2="240" y2="110" stroke="#f59e0b" stroke-width="3" />

          <!-- Center of Gravity (CoG) Crosshair (approx x: 160, y: 75) -->
          <g transform="translate(160, 75)">
            <circle cx="0" cy="0" r="7" fill="#fbbf24" opacity="0.2" />
            <circle cx="0" cy="0" r="4" fill="#fbbf24" />
            <line x1="-8" y1="0" x2="8" y2="0" stroke="#ffffff" stroke-width="1.5" />
            <line x1="0" y1="-8" x2="0" y2="8" stroke="#ffffff" stroke-width="1.5" />
            <text x="10" y="4" fill="#fbbf24" font-size="9" font-family="monospace">CoG (h: {{ inst().vehicle.cogHeight }}m)</text>
          </g>

          <!-- Wheelbase Dimension line L -->
          <line x1="80" y1="145" x2="240" y2="145" stroke="#64748b" stroke-width="1" />
          <line x1="80" y1="141" x2="80" y2="149" stroke="#64748b" stroke-width="1" />
          <line x1="240" y1="141" x2="240" y2="149" stroke="#64748b" stroke-width="1" />
          <text x="160" y="155" fill="#94a3b8" font-size="9" font-family="monospace" text-anchor="middle">
            Wheelbase L: {{ inst().vehicle.wheelbase }}m
          </text>
        </svg>
      </div>

      <!-- Real-Time Physical State Readouts -->
      @if (currentFrame(); as frame) {
        <div class="grid grid-cols-2 gap-2 text-xs font-mono">
          <app-led-slip-bar
            label="FRONT SLIP (κ_f)"
            [slipRatio]="frame.slipRatioFront"
          />
          <app-led-slip-bar
            label="REAR SLIP (κ_r)"
            [slipRatio]="frame.slipRatioRear"
          />
        </div>

        <div class="grid grid-cols-3 gap-1.5 p-2 bg-slate-900 border border-slate-800 rounded-xs text-[11px] font-mono">
          <div>
            <div class="text-slate-400">Front F_z:</div>
            <div class="text-amber-400 font-bold tabular-nums">{{ (frame.normalLoadFront / 1000).toFixed(2) }} kN</div>
          </div>
          <div>
            <div class="text-slate-400">Rear F_z:</div>
            <div class="text-cyan-400 font-bold tabular-nums">{{ (frame.normalLoadRear / 1000).toFixed(2) }} kN</div>
          </div>
          <div>
            <div class="text-slate-400">Rotor Temp:</div>
            <div class="text-rose-400 font-bold tabular-nums">{{ frame.rotorTemperature.toFixed(1) }} °C</div>
          </div>
        </div>
      }
    </div>
  `
})
export class AnatomyInspectorComponent {
  readonly store = inject(BenchmarkStore);

  inst = this.store.selectedInstance;

  currentFrame = () => {
    const id = this.store.selectedInstanceId();
    return this.store.scrubFrames()[id];
  };
}
