import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';

@Component({
  selector: 'app-trajectory-scrubber',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-wrap items-center gap-3 px-4 py-2.5 bg-[#FFFFFF] border border-[#E6DFD3] rounded-xl shadow-2xs select-none">
      <!-- 1. Play / Pause / Replay Button with Idle Stance Indicator -->
      <button
        type="button"
        (click)="handlePlay()"
        class="px-3.5 py-1.5 font-bold rounded-lg transition-colors cursor-pointer text-xs sm:text-sm flex items-center gap-1.5 shadow-2xs shrink-0"
        [ngClass]="
          store.isPlaying()
            ? 'bg-[#F2554A] hover:bg-[#C93A30] text-white'
            : isAtEnd()
              ? 'bg-[#FDEBE8] text-[#C93A30] border border-[#F2554A] hover:bg-[#F2554A] hover:text-white'
              : 'bg-[#F2554A] hover:bg-[#C93A30] text-white'
        "
        [title]="store.isPlaying() ? 'Pause playback (enters idle stance)' : (isAtEnd() ? 'Replay simulation from start' : 'Play simulation trajectory')"
      >
        <span>{{ store.isPlaying() ? '❚❚ Pause' : (isAtEnd() ? '↺ Replay' : '► Play') }}</span>
        @if (!store.isPlaying() && !isAtEnd()) {
          <span class="text-[10px] px-1.5 py-0.5 rounded bg-black/15 text-white font-mono font-medium tracking-wide">
            IDLE
          </span>
        }
      </button>

      <!-- 2. Dedicated Reset Button -->
      <button
        type="button"
        (click)="store.resetPlayback()"
        class="px-2.5 py-1.5 bg-white hover:bg-[#FAF7F2] text-[#22201E] hover:text-[#000000] font-semibold rounded-lg border border-[#E6DFD3] hover:border-[#6B645C] flex items-center gap-1 transition-colors cursor-pointer text-xs shrink-0 shadow-2xs"
        title="Reset playback to start line (t = 0.00s)"
      >
        <span>↺ Reset</span>
      </button>

      <!-- 3. Scrub Time Readout -->
      <div class="flex items-center gap-1.5 min-w-32 text-xs sm:text-sm shrink-0 font-mono tabular-nums">
        <span class="font-bold text-[#22201E]">{{ store.scrubTime().toFixed(2) }} s</span>
        <span class="text-[#A39B90]">/</span>
        <span class="text-[#6B645C]">{{ store.maxRunTime().toFixed(2) }} s</span>
      </div>

      <!-- 4. Scrubber Range Slider with dynamic progress track fill -->
      <input
        type="range"
        min="0"
        [max]="store.maxRunTime()"
        step="0.01"
        [value]="store.scrubTime()"
        (input)="onScrubInput($event)"
        class="coral-slider flex-1 h-2 cursor-pointer min-w-32"
        [style.--track-bg]="trackBackground()"
        title="Scrub simulation trajectory"
      />

      <!-- 5. Speed Multiplier Pills (0.5x, 1x, 2x) -->
      <div class="flex items-center border border-[#E6DFD3] rounded-lg p-0.5 bg-[#F3EEE6] shrink-0">
        @for (speed of [0.5, 1.0, 2.0]; track speed) {
          <button
            type="button"
            (click)="store.setPlaybackSpeed(speed)"
            class="px-2 py-1 text-xs rounded-md transition-colors cursor-pointer font-medium"
            [ngClass]="
              store.playbackSpeed() === speed
                ? 'bg-white text-[#22201E] font-bold shadow-2xs border border-[#E6DFD3]'
                : 'text-[#6B645C] hover:text-[#22201E]'
            "
          >
            {{ speed === 1.0 ? '1x' : (speed === 2.0 ? '2x' : '0.5x') }}
          </button>
        }
      </div>

      <!-- 6. Live Auto-compute Toggle -->
      <button
        type="button"
        (click)="store.toggleAutoCompute()"
        class="px-2.5 py-1.5 text-xs rounded-lg border font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
        [ngClass]="
          store.autoCompute()
            ? 'bg-[#EAF7EE] text-[#1E7E4E] border-[#2F9E6B] shadow-2xs'
            : 'bg-white text-[#6B645C] border-[#E6DFD3] hover:text-[#22201E] hover:border-[#6B645C]'
        "
        title="Toggle automatic recomputation on parameter change"
      >
        <span class="w-1.5 h-1.5 rounded-full" [ngClass]="store.autoCompute() ? 'bg-[#2F9E6B]' : 'bg-[#A39B90]'"></span>
        <span>{{ store.autoCompute() ? 'LIVE' : 'MANUAL' }}</span>
      </button>
    </div>
  `
})
export class TrajectoryScrubberComponent {
  readonly store = inject(BenchmarkStore);

  readonly progressPercent = computed(() => {
    const max = this.store.maxRunTime();
    if (max <= 0) return 0;
    const pct = (this.store.scrubTime() / max) * 100;
    return Math.max(0, Math.min(100, pct));
  });

  trackBackground(): string {
    const pct = this.progressPercent().toFixed(1);
    return `linear-gradient(to right, #F2554A 0%, #F2554A ${pct}%, #E6DFD3 ${pct}%, #E6DFD3 100%)`;
  }

  isAtEnd(): boolean {
    return this.store.scrubTime() >= this.store.maxRunTime() - 0.05;
  }

  handlePlay(): void {
    if (this.isAtEnd()) {
      this.store.resetPlayback();
      this.store.togglePlay();
    } else {
      this.store.togglePlay();
    }
  }

  onScrubInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    if (!isNaN(val)) {
      this.store.setScrubTime(val);
    }
  }
}
