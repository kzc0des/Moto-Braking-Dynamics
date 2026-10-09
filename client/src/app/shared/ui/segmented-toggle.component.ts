import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToggleOption<T> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-segmented-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex p-0.5 bg-slate-950 border border-slate-800 rounded-xs">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          (click)="selectOption(opt.value)"
          class="flex-1 px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors duration-100 text-center"
          [ngClass]="
            value() === opt.value
              ? 'bg-slate-800 text-amber-400 font-semibold shadow-xs'
              : 'text-slate-400 hover:text-slate-200'
          "
        >
          {{ opt.label }}
        </button>
      }
    </div>
  `
})
export class SegmentedToggleComponent<T> {
  readonly options = input.required<ToggleOption<T>[]>();
  readonly value = input.required<T>();
  readonly valueChange = output<T>();

  selectOption(val: T): void {
    if (this.value() !== val) {
      this.valueChange.emit(val);
    }
  }
}
