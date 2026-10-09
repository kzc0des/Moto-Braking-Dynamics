import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-param-slider',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-1.5 py-1.5">
      <div class="flex items-center justify-between text-xs">
        <label class="font-medium text-slate-200 flex items-center gap-1.5">
          <span>{{ label() }}</span>
          @if (symbol()) {
            <span class="text-[10px] font-mono text-slate-400">({{ symbol() }})</span>
          }
        </label>
        <div class="flex items-center gap-1">
          <input
            type="number"
            [min]="min()"
            [max]="max()"
            [step]="step()"
            [ngModel]="value()"
            (ngModelChange)="onInputChange($event)"
            class="w-16 px-1.5 py-0.5 text-right font-mono text-xs bg-slate-900 border rounded-xs text-slate-100 tabular-nums focus:outline-none focus:border-amber-400"
            [ngClass]="isOutOfBounds() ? 'border-rose-500 text-rose-300' : 'border-slate-800'"
          />
          <span class="text-[10px] font-mono text-slate-400 min-w-6">{{ unit() }}</span>
        </div>
      </div>

      <input
        type="range"
        [min]="min()"
        [max]="max()"
        [step]="step()"
        [value]="value()"
        (input)="onSliderInput($event)"
        class="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 hover:accent-amber-300 transition-colors"
      />

      @if (description()) {
        <p class="text-[10px] text-slate-400 leading-tight">{{ description() }}</p>
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
    if (typeof val === 'number' && !isNaN(val)) {
      const clamped = Math.max(this.min(), Math.min(this.max(), val));
      this.valueChange.emit(clamped);
    }
  }
}
