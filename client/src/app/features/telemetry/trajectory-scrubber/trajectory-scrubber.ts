import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../../state/benchmark.store';

@Component({
  selector: 'app-trajectory-scrubber',
  imports: [CommonModule],
  templateUrl: './trajectory-scrubber.html',
  styleUrl: './trajectory-scrubber.css'
})
export class TrajectoryScrubber {
  readonly store = inject(BenchmarkStore);

  readonly progressPercent = computed(() => {
    const max = this.store.maxRunTime();
    if (max <= 0) return 0;
    const pct = (this.store.scrubTime() / max) * 100;
    return Math.max(0, Math.min(100, pct));
  });

  trackBackground(): string {
    const pct = this.progressPercent().toFixed(1);
    return `linear-gradient(to right, #FFC800 0%, #FFC800 ${pct}%, #DDE0E4 ${pct}%, #DDE0E4 100%)`;
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
