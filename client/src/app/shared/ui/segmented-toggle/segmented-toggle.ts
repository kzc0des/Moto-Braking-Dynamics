import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ToggleOption<T> {
  value: T;
  label: string;
}

@Component({
  selector: 'app-segmented-toggle',
  imports: [CommonModule],
  templateUrl: './segmented-toggle.html',
  styleUrl: './segmented-toggle.css'
})
export class SegmentedToggle<T> {
  readonly options = input.required<ToggleOption<T>[]>();
  readonly value = input.required<T>();
  readonly valueChange = output<T>();

  selectOption(val: T): void {
    if (this.value() !== val) {
      this.valueChange.emit(val);
    }
  }
}
