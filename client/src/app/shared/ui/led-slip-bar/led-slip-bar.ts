import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-led-slip-bar',
  imports: [CommonModule],
  templateUrl: './led-slip-bar.html',
  styleUrl: './led-slip-bar.css'
})
export class LedSlipBar {
  readonly label = input<string>('Slip Ratio (κ)');
  readonly slipRatio = input.required<number>(); // 0.0 to 1.0+

  readonly segments = computed(() => {
    const slip = Math.max(0, Math.min(1.0, this.slipRatio()));
    const activeCount = Math.round(slip * 10);

    return Array.from({ length: 10 }, (_, i) => {
      const active = i < activeCount;
      let color = 'bg-[var(--ok)]';
      if (i >= 2 && i < 6) {
        // around 15-20% critical slip
        color = 'bg-[var(--warn)]';
      } else if (i >= 6) {
        // unstable / impending lockup
        color = 'bg-[var(--danger)]';
      }
      return { active, color };
    });
  });
}
