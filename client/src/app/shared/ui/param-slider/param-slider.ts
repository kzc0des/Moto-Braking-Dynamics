import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-param-slider',
  imports: [CommonModule, FormsModule],
  templateUrl: './param-slider.html',
  styleUrl: './param-slider.css'
})
export class ParamSlider {
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
