import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-param-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-1.5 py-1.5">
      <div class="flex items-center justify-between text-sm">
        <label class="font-semibold text-[#22201E] flex items-center gap-1.5 text-xs sm:text-sm">
          <span>{{ label() }}</span>
          @if (symbol()) {
            <span class="text-xs text-[#6B645C]">({{ symbol() }})</span>
          }
        </label>
        <div class="flex items-center gap-1.5">
          <input
            type="number"
            [min]="min()"
            [max]="max()"
            [step]="step()"
            [ngModel]="value()"
            (ngModelChange)="onInputChange($event)"
            class="w-20 px-2 py-1 text-right text-xs sm:text-sm bg-white border rounded-md text-[#22201E] tabular-nums focus:outline-none focus:border-[#F2554A]"
            [ngClass]="isOutOfBounds() ? 'border-[#F2554A] text-[#C93A30]' : 'border-[#E6DFD3]'"
          />
          <span class="text-xs text-[#6B645C] min-w-7">{{ unit() }}</span>
        </div>
      </div>

      <input
        type="range"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [value]="value()"
        (input)="onSliderInput($event)"
        class="w-full h-1.5 bg-[#E6DFD3] rounded-lg appearance-none cursor-pointer accent-[#F2554A] hover:accent-[#C93A30] transition-colors"
      />

      @if (description()) {
        <p class="text-xs text-[#6B645C] leading-normal">{{ description() }}</p>
      }
    </div>
  `
})
export class ParamSliderComponent {
  readonly label = input.required<string>();
  readonly symbol = input<string>('');
  readonly unit = input<string>('');
  readonly description = input<string>('');
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly step = input<number>(1);
  readonly value = input.required<number>();

  readonly valueChange = output<number>();

  readonly isOutOfBounds = computed(() => {
    const val = this.value();
    return val < this.min() || val > this.max();
  });

  onSliderInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const num = parseFloat(target.value);
    if (!isNaN(num)) {
      this.valueChange.emit(num);
    }
  }

  onInputChange(val: number): void {
    if (val !== undefined && val !== null && !isNaN(val)) {
      this.valueChange.emit(val);
    }
  }
}
