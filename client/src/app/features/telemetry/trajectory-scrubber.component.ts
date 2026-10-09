import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';

@Component({
  selector: 'app-trajectory-scrubber',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex items-center gap-3 p-2 bg-slate-900 border border-slate-800 rounded-xs text-xs font-mono select-none">
      <!-- Play/Pause Button with Idle Stance Indicator -->
      <button
        type="button"
        (click)="store.togglePlay()"
        class="px-2.5 py-1 font-bold rounded-xs border flex items-center gap-1.5 transition-all cursor-pointer text-xs"
        [style.borderColor]="store.isPlaying() ? '#fbbf24' : store.selectedInstance().colorAccent"
        [style.backgroundColor]="store.isPlaying() ? 'rgba(245, 158, 11, 0.15)' : store.selectedInstance().colorAccent + '18'"
        [style.color]="store.isPlaying() ? '#fbbf24' : store.selectedInstance().colorAccent"
        [title]="store.isPlaying() ? 'Pause playback (enters idle mode)' : (isAtEnd() ? 'Replay simulation from start' : 'Play simulation trajectory')"
      >
        <span class="w-1.5 h-1.5 rounded-full" [style.backgroundColor]="store.isPlaying() ? '#fbbf24' : store.selectedInstance().colorAccent"></span>
        <span>{{ store.isPlaying() ? 'PAUSE' : (isAtEnd() ? '↺ REPLAY' : 'PLAY') }}</span>
        @if (!store.isPlaying() && !isAtEnd()) {
          <span class="text-[9px] px-1 py-0.2 rounded-xs bg-slate-950/80 border border-slate-700 font-mono font-normal text-slate-300">
            IDLE
          </span>
        }
      </button>

      <!-- Repeat / Retry / Reset Button -->
      <button
        type="button"
        (click)="store.resetPlayback()"
        class="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold rounded-xs border border-slate-700 flex items-center gap-1 transition-all cursor-pointer text-xs"
        title="Reset playback to start line (t = 0.00s)"
      >
        <span>↺ RESET</span>
      </button>

      <!-- Scrub Time Readout -->
      <div class="flex items-center gap-1 min-w-28 text-slate-300">
        <span class="text-amber-400 font-bold tabular-nums">{{ store.scrubTime().toFixed(2) }}s</span>
        <span class="text-slate-500">/</span>
        <span class="text-slate-400 tabular-nums">{{ store.maxRunTime().toFixed(2) }}s</span>
      </div>

      <!-- Scrubber Slider -->
      <input
        type="range"
        min="0"
        [max]="store.maxRunTime()"
        step="0.01"
        [value]="store.scrubTime()"
        (input)="onScrubInput($event)"
        class="flex-1 h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300"
      />

      <!-- Speed Multiplier -->
      <div class="flex items-center bg-slate-950 border border-slate-800 rounded-xs p-0.5">
        @for (speed of [0.5, 1.0, 2.0]; track speed) {
          <button
            type="button"
            (click)="store.setPlaybackSpeed(speed)"
            class="px-1.5 py-0.5 text-[10px] rounded-xs"
            [ngClass]="store.playbackSpeed() === speed ? 'bg-slate-800 text-amber-400 font-bold' : 'text-slate-500 hover:text-slate-300'"
          >
            {{ speed }}x
          </button>
        }
      </div>

      <!-- Live Auto-compute toggle -->
      <button
        type="button"
        (click)="store.toggleAutoCompute()"
        class="px-2 py-0.5 text-[10px] border rounded-xs transition-colors"
        [ngClass]="store.autoCompute() ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/40' : 'bg-slate-950 text-slate-500 border-slate-800'"
        title="Toggle automatic recomputation on slider adjust"
      >
        {{ store.autoCompute() ? 'LIVE' : 'MANUAL' }}
      </button>

      <!-- Manual Re-run button -->
      <button
        type="button"
        (click)="store.triggerSimulation()"
        class="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xs transition-colors"
        [disabled]="store.isLoading()"
      >
        {{ store.isLoading() ? 'SOLVING...' : 'RUN' }}
      </button>
    </div>
  `
})
export class TrajectoryScrubberComponent {
  readonly store = inject(BenchmarkStore);

  isAtEnd(): boolean {
    return this.store.scrubTime() >= this.store.maxRunTime() - 0.05;
  }

  onScrubInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    if (!isNaN(val)) {
      this.store.setScrubTime(val);
    }
  }
}
