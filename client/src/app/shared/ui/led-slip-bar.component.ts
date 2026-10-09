import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-led-slip-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span class="truncate">{{ label() }}</span>
        <span class="text-slate-200 font-semibold tabular-nums">{{ (slipRatio() * 100).toFixed(1) }}%</span>
      </div>
      <div class="grid grid-cols-10 gap-0.5 p-1 bg-slate-950 border border-slate-800 rounded-xs">
        @for (seg of segments(); track $index) {
          <div
            class="h-2 rounded-[1px] transition-colors duration-75"
            [ngClass]="seg.active ? seg.color : 'bg-slate-900 opacity-40'"
          ></div>
        }
      </div>
    </div>
  `
})
export class LedSlipBarComponent {
  readonly label = input<string>('Slip Ratio (κ)');
  readonly slipRatio = input.required<number>(); // 0.0 to 1.0+

  readonly segments = computed(() => {
    const slip = Math.max(0, Math.min(1.0, this.slipRatio()));
    const activeCount = Math.round(slip * 10);

    return Array.from({ length: 10 }, (_, i) => {
      const active = i < activeCount;
      let color = 'bg-emerald-500';
      if (i >= 2 && i < 6) {
        // around 15-20% critical slip
        color = 'bg-amber-400';
      } else if (i >= 6) {
        // unstable / impending lockup
        color = 'bg-rose-500';
      }
      return { active, color };
    });
  });
}
