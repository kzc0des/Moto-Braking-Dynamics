import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../../state/benchmark.store';
import { ParamSlider } from '../../../shared/ui/param-slider/param-slider';

@Component({
  selector: 'app-chassis-panel',
  imports: [CommonModule, ParamSlider],
  templateUrl: './chassis-panel.html',
  styleUrl: './chassis-panel.css'
})
export class ChassisPanel {
  readonly store = inject(BenchmarkStore);
  vehicle = () => this.store.selectedInstance().vehicle;
}
