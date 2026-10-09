import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { LedSlipBarComponent } from '../../shared/ui/led-slip-bar.component';
import { OutcomeBadgeComponent } from '../../shared/ui/outcome-badge.component';

@Component({
  selector: 'app-anatomy-inspector',
  standalone: true,
  imports: [CommonModule, LedSlipBarComponent, OutcomeBadgeComponent],
  template: `
    @if (isMinimized()) {
      <!-- Minimized Vertical Dock State -->
      <div
        (click)="toggleMinimize.emit()"
        class="h-full min-h-[320px] w-full bg-slate-950 border border-slate-800 rounded-sm flex flex-col items-center justify-between py-3 px-1 cursor-pointer hover:border-amber-500/50 transition-colors shadow-md select-none group"
        title="Click to expand Anatomy Inspector"
      >
        <!-- Expand Action Button -->
        <button
          type="button"
          (click)="$event.stopPropagation(); toggleMinimize.emit()"
          class="w-8 h-8 rounded-xs bg-slate-900 border border-slate-700 text-slate-300 group-hover:text-amber-400 group-hover:border-amber-400 flex items-center justify-center text-xs font-mono transition-colors"
          title="Expand Anatomy Inspector"
        >
          ⤢
        </button>

        <!-- Vertical Rotated Title & Vehicle Indicator -->
        <div class="flex flex-col items-center gap-2 py-4">
          <span
            class="w-2.5 h-2.5 rounded-full"
            [style.backgroundColor]="inst().colorAccent"
          ></span>
          <span class="text-[11px] font-mono font-bold tracking-widest text-slate-400 group-hover:text-slate-200 [writing-mode:vertical-lr] rotate-180 uppercase">
            ANATOMY INSPECTOR
          </span>
        </div>

        <!-- Mini Live Slip Dots & Status -->
        @if (currentFrame(); as frame) {
          <div class="flex flex-col items-center gap-1.5 font-mono text-[9px]">
            <div
              class="w-2.5 h-2.5 rounded-xs"
              [ngClass]="Math.abs(frame.slipRatioFront) > 0.14 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'"
              title="Front slip state"
            ></div>
            <div
              class="w-2.5 h-2.5 rounded-xs"
              [ngClass]="Math.abs(frame.slipRatioRear) > 0.14 ? 'bg-rose-500 animate-pulse' : 'bg-cyan-500'"
              title="Rear slip state"
            ></div>
          </div>
        }
      </div>
    } @else {
      <!-- Expanded Anatomy Inspector State -->
      <div class="flex flex-col gap-2.5 p-3 bg-slate-950 border border-slate-800 rounded-sm shadow-md h-full select-none overflow-y-auto">
        <div class="flex items-center justify-between text-xs font-mono">
          <div class="flex items-center gap-2">
            <span
              class="w-2.5 h-2.5 rounded-full"
              [style.backgroundColor]="inst().colorAccent"
            ></span>
            <span class="text-slate-200 font-bold tracking-wide">ANATOMY INSPECTOR</span>
          </div>

          <div class="flex items-center gap-2">
            @if (currentFrame(); as frame) {
              <app-outcome-badge [outcome]="frame.terminalOutcome" />
            }

            <!-- Minimize Button -->
            <button
              type="button"
              (click)="toggleMinimize.emit()"
              class="px-2 py-0.5 bg-slate-900 border border-slate-700 text-slate-400 hover:text-amber-400 hover:border-amber-400 rounded-xs transition-colors"
              title="Minimize to side strip"
            >
              - MINIMIZE
            </button>
          </div>
        </div>

        <!-- Live Vehicle Sprite Asset Preview Card -->
        <div class="flex items-center justify-between px-2.5 py-1.5 bg-[#0e1420] border border-slate-800 rounded-xs">
          <div class="flex items-center gap-2.5">
            <img
              [src]="'sprites/' + getSpriteKey() + (activePreviewMode() === 'ride' ? '_ride_preview.gif' : '_idle_preview.gif')"
              class="h-9 object-contain"
              [alt]="inst().name"
            />
            <div>
              <div class="text-[11px] font-bold font-mono" [style.color]="inst().colorAccent">{{ inst().name }}</div>
              <div class="text-[9px] font-mono text-slate-400">
                {{ activePreviewMode() === 'ride' ? 'DYNAMIC RIDING ANIMATION' : 'IDLE ENGINE & BREATHING' }}
              </div>
            </div>
          </div>
          <!-- Idle / Ride Mode Toggles -->
          <div class="flex items-center gap-1">
            <button
              type="button"
              (click)="previewMode.set('idle')"
              class="text-[9px] font-mono px-1.5 py-0.5 rounded-xs border font-bold transition-all cursor-pointer"
              [style.borderColor]="activePreviewMode() === 'idle' ? inst().colorAccent : 'rgba(51, 65, 85, 0.6)'"
              [style.color]="activePreviewMode() === 'idle' ? inst().colorAccent : '#64748b'"
              [style.backgroundColor]="activePreviewMode() === 'idle' ? inst().colorAccent + '20' : 'transparent'"
              title="View Idle Animation"
            >
              IDLE
            </button>
            <button
              type="button"
              (click)="previewMode.set('ride')"
              class="text-[9px] font-mono px-1.5 py-0.5 rounded-xs border font-bold transition-all cursor-pointer"
              [style.borderColor]="activePreviewMode() === 'ride' ? inst().colorAccent : 'rgba(51, 65, 85, 0.6)'"
              [style.color]="activePreviewMode() === 'ride' ? inst().colorAccent : '#64748b'"
              [style.backgroundColor]="activePreviewMode() === 'ride' ? inst().colorAccent + '20' : 'transparent'"
              title="View Ride Animation"
            >
              RIDE
            </button>
            <button
              type="button"
              (click)="previewMode.set('auto')"
              class="text-[9px] font-mono px-1 py-0.5 rounded-xs border transition-all cursor-pointer"
              [style.borderColor]="previewMode() === 'auto' ? inst().colorAccent : 'rgba(51, 65, 85, 0.4)'"
              [style.color]="previewMode() === 'auto' ? inst().colorAccent : '#475569'"
              title="Auto: follow simulation velocity"
            >
              SYNC
            </button>
          </div>
        </div>

        <!-- 2D SVG Schematic -->
        <div class="relative w-full h-44 bg-slate-900 border border-slate-800 rounded-xs flex items-center justify-center p-2 overflow-hidden">
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
            <!-- Main Frame Spars tinted with instance color -->
            <polygon points="150,95 215,65 160,50" fill="#1e293b" [attr.stroke]="inst().colorAccent" stroke-width="2" />
            <!-- Front Fork -->
            <line x1="215" y1="65" x2="240" y2="110" stroke="#f59e0b" stroke-width="3" />

            <!-- Center of Gravity (CoG) Crosshair (approx x: 160, y: 75) -->
            <g transform="translate(160, 75)">
              <circle cx="0" cy="0" r="7" [attr.fill]="inst().colorAccent" opacity="0.2" />
              <circle cx="0" cy="0" r="4" [attr.fill]="inst().colorAccent" />
              <line x1="-8" y1="0" x2="8" y2="0" stroke="#ffffff" stroke-width="1.5" />
              <line x1="0" y1="-8" x2="0" y2="8" stroke="#ffffff" stroke-width="1.5" />
              <text x="10" y="4" [attr.fill]="inst().colorAccent" font-size="9" font-family="monospace">CoG (h: {{ inst().vehicle.cogHeight }}m)</text>
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
    }
  `
})
export class AnatomyInspectorComponent {
  readonly store = inject(BenchmarkStore);
  readonly isMinimized = input<boolean>(false);
  readonly toggleMinimize = output<void>();

  readonly Math = Math;
  readonly previewMode = signal<'auto' | 'idle' | 'ride'>('auto');

  inst = this.store.selectedInstance;

  currentFrame = () => {
    const id = this.store.selectedInstanceId();
    return this.store.scrubFrames()[id];
  };

  activePreviewMode(): 'idle' | 'ride' {
    const mode = this.previewMode();
    if (mode !== 'auto') return mode;
    if (!this.store.isPlaying()) return 'idle';
    const frame = this.currentFrame();
    return frame && frame.velocity > 0.08 ? 'ride' : 'idle';
  }

  getSpriteKey(): string {
    const key = this.inst().spriteKey;
    if (key) return key;
    const name = this.inst().name.toLowerCase();
    if (name.includes('scooter')) return 'scooter';
    if (name.includes('cruiser')) return 'cruiser';
    return 'ninja';
  }
}
