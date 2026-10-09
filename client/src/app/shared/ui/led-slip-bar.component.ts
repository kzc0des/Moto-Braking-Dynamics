import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-led-slip-bar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col gap-1">
      <div class="flex items-center justify-between text-xs font-mono text-[#6B645C]">
        <span class="truncate font-semibold">{{ label() }}</span>
        <span class="text-[#22201E] font-bold tabular-nums">{{ (slipRatio() * 100).toFixed(1) }}%</span>
      </div>
      <div class="grid grid-cols-10 gap-1 p-1 bg-[#F3EEE6] border border-[#E6DFD3] rounded-md">
        @for (seg of segments(); track $index) {
          <div
            class="h-2 rounded-[2px] transition-colors duration-75"
            [ngClass]="seg.active ? seg.color : 'bg-[#E6DFD3]'"
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
      let color = 'bg-[#2F9E6B]';
      if (i >= 2 && i < 6) {
        // around 15-20% critical slip
        color = 'bg-[#E0A030]';
      } else if (i >= 6) {
        // unstable / impending lockup
        color = 'bg-[#F2554A]';
      }
      return { active, color };
    });
  });
}
