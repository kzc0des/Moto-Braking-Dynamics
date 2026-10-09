import { Component, inject, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';

@Component({
  selector: 'app-anatomy-inspector',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isMinimized()) {
      <!-- Minimized State -->
      <div
        (click)="toggleMinimize.emit()"
        class="h-full min-h-[300px] w-full bg-white border border-[#E6DFD3] rounded-xl flex flex-col items-center justify-between py-3 px-1 cursor-pointer hover:border-[#F2554A] transition-colors shadow-xs select-none"
        title="Click to expand Anatomy Inspector"
      >
        <button
          type="button"
          (click)="$event.stopPropagation(); toggleMinimize.emit()"
          class="w-7 h-7 rounded-md bg-[#FAF7F2] border border-[#E6DFD3] text-[#6B645C] hover:text-[#22201E] flex items-center justify-center text-xs transition-colors"
        >
          ⤢
        </button>
        <span class="text-xs font-bold text-[#6B645C] [writing-mode:vertical-lr] rotate-180 uppercase tracking-wider">
          Anatomy Inspector
        </span>
        <span class="w-2.5 h-2.5 rounded-full bg-[#F2554A]"></span>
      </div>
    } @else {
      <!-- Expanded State Matching Screenshot -->
      <div class="bg-white border border-[#E6DFD3] rounded-xl shadow-xs p-4 flex flex-col gap-3.5 h-full select-none">
        <!-- Header: "Anatomy inspector" + Coral Outline "Safe stop" Pill -->
        <div class="flex items-center justify-between pb-1 border-b border-[#E6DFD3]/60">
          <div class="font-bold text-[#22201E] text-base">Anatomy inspector</div>

          <div class="flex items-center gap-2">
            <span class="border border-[#F2554A] text-[#F2554A] text-xs font-semibold px-2.5 py-0.5 rounded-md">
              {{ getStatusLabel() }}
            </span>

            <button
              type="button"
              (click)="toggleMinimize.emit()"
              class="text-xs text-[#A39B90] hover:text-[#6B645C] cursor-pointer"
              title="Minimize panel"
            >
              –
            </button>
          </div>
        </div>

        <!-- Selected Vehicle Sub-card -->
        <div class="bg-[#FAF7F2] border border-[#E6DFD3] rounded-lg p-3.5 flex flex-col gap-3">
          <!-- Sub-card Header -->
          <div>
            <div class="text-sm font-bold text-[#22201E]">{{ inst().name }}</div>
            <div class="text-xs text-[#6B645C]">
              Chassis & geometry architecture
            </div>
          </div>

          <!-- 2D Motorcycle Skeleton Anatomy Schematic -->
          <div class="relative w-full h-36 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 320 140" class="w-full h-full">
              <!-- Rear Wheel (Ink #2E2C33) -->
              <circle cx="70" cy="85" r="22" stroke="#2E2C33" stroke-width="2.5" fill="none" />
              <circle cx="70" cy="85" r="4" fill="#2E2C33" />

              <!-- Front Wheel (Coral #F2554A) -->
              <circle cx="250" cy="85" r="22" stroke="#F2554A" stroke-width="2.5" fill="none" />
              <circle cx="250" cy="85" r="4" fill="#F2554A" />

              <!-- Chassis Frame Lines -->
              <!-- Swingarm -->
              <line x1="70" y1="85" x2="145" y2="70" stroke="#2E2C33" stroke-width="2.5" />
              <!-- Steering neck -->
              <line x1="145" y1="70" x2="225" y2="40" stroke="#2E2C33" stroke-width="2.5" />
              <!-- Front fork -->
              <line x1="225" y1="40" x2="250" y2="85" stroke="#6F8FAF" stroke-width="2.5" />
              <!-- Upper frame truss -->
              <line x1="145" y1="70" x2="185" y2="35" stroke="#6B645C" stroke-width="1.5" />
              <line x1="185" y1="35" x2="225" y2="40" stroke="#6B645C" stroke-width="1.5" />
              <line x1="70" y1="85" x2="225" y2="40" stroke="#E6DFD3" stroke-width="1" stroke-dasharray="2,2" />

              <!-- Center of Gravity (CoG) Coral Crosshair Target -->
              <g transform="translate(170, 52)">
                <circle cx="0" cy="0" r="8" stroke="#F2554A" stroke-width="1.5" fill="none" />
                <line x1="-10" y1="0" x2="10" y2="0" stroke="#F2554A" stroke-width="1.5" />
                <line x1="0" y1="-10" x2="0" y2="10" stroke="#F2554A" stroke-width="1.5" />
              </g>

              <!-- Dimension Guidelines below -->
              <line x1="70" y1="120" x2="250" y2="120" stroke="#E6DFD3" stroke-width="1" />
              <line x1="70" y1="116" x2="70" y2="124" stroke="#A39B90" stroke-width="1" />
              <line x1="250" y1="116" x2="250" y2="124" stroke="#A39B90" stroke-width="1" />

              <text x="70" y="134" fill="#6B645C" font-size="11" font-family="system-ui, sans-serif">
                Wheelbase {{ inst().vehicle.wheelbase }} m
              </text>
              <text x="250" y="134" fill="#6B645C" font-size="11" font-family="system-ui, sans-serif" text-anchor="end">
                CoG h {{ inst().vehicle.cogHeight }} m
              </text>
            </svg>
          </div>

          <!-- Slip Metrics Horizontal Bars -->
          @if (currentFrame(); as frame) {
            <div class="grid grid-cols-2 gap-4 pt-1">
              <!-- Front Slip (Coral) -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-[#6B645C]">Front slip</span>
                  <span class="font-bold text-[#22201E] tabular-nums">
                    {{ (Math.abs(frame.slipRatioFront) * 100).toFixed(1) }}%
                  </span>
                </div>
                <div class="w-full h-1.5 bg-[#E6DFD3] rounded-full overflow-hidden">
                  <div
                    class="h-full bg-[#F2554A] rounded-full transition-all duration-75"
                    [style.width.%]="Math.min(100, Math.abs(frame.slipRatioFront) * 500)"
                  ></div>
                </div>
              </div>

              <!-- Rear Slip (Ink) -->
              <div class="flex flex-col gap-1">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-[#6B645C]">Rear slip</span>
                  <span class="font-bold text-[#22201E] tabular-nums">
                    {{ (Math.abs(frame.slipRatioRear) * 100).toFixed(1) }}%
                  </span>
                </div>
                <div class="w-full h-1.5 bg-[#E6DFD3] rounded-full overflow-hidden">
                  <div
                    class="h-full bg-[#2E2C33] rounded-full transition-all duration-75"
                    [style.width.%]="Math.min(100, Math.abs(frame.slipRatioRear) * 500)"
                  ></div>
                </div>
              </div>
            </div>

            <!-- 3-Column Stats Row: Front Fz, Rear Fz, Rotor Temp -->
            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-[#E6DFD3]/80">
              <div>
                <div class="text-[11px] text-[#6B645C]">Front Fz</div>
                <div class="text-sm font-bold text-[#22201E] tabular-nums">
                  {{ (frame.normalLoadFront / 1000).toFixed(2) }} kN
                </div>
              </div>
              <div>
                <div class="text-[11px] text-[#6B645C]">Rear Fz</div>
                <div class="text-sm font-bold text-[#22201E] tabular-nums">
                  {{ (frame.normalLoadRear / 1000).toFixed(2) }} kN
                </div>
              </div>
              <div>
                <div class="text-[11px] text-[#6B645C]">Rotor temp</div>
                <div class="text-sm font-bold text-[#22201E] tabular-nums">
                  {{ frame.rotorTemperature.toFixed(1) }} °C
                </div>
              </div>
            </div>
          }
        </div>
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

  getStatusLabel(): string {
    const frame = this.currentFrame();
    if (!frame) return 'Safe stop';
    if (frame.terminalOutcome === 'Front-Wheel Washout') return 'Washout';
    if (frame.terminalOutcome === 'Barrier Collision') return 'Barrier hit';
    if (frame.terminalOutcome === 'Rear-Wheel Lift-off') return 'Rear lift';
    return 'Safe stop';
  }
}
