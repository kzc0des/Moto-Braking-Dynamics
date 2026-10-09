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
    <div class="flex p-0.5 bg-[#FAF7F2] border border-[#E6DFD3] rounded-lg">
      @for (opt of options(); track opt.value) {
        <button
          type="button"
          (click)="selectOption(opt.value)"
          class="flex-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors text-center cursor-pointer"
          [ngClass]="
            value() === opt.value
              ? 'bg-white text-[#22201E] font-bold shadow-2xs border border-[#E6DFD3]'
              : 'text-[#6B645C] hover:text-[#22201E]'
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
