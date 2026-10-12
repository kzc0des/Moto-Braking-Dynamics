import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../../state/benchmark.store';
import { SegmentedToggle, ToggleOption } from '../../../shared/ui/segmented-toggle/segmented-toggle';
import { ParamSlider } from '../../../shared/ui/param-slider/param-slider';
import { ActuationType } from '../../../core/models/benchmark.types';

@Component({
  selector: 'app-actuation-panel',
  imports: [CommonModule, SegmentedToggle, ParamSlider],
  templateUrl: './actuation-panel.html',
  styleUrl: './actuation-panel.css'
})
export class ActuationPanel {
  readonly store = inject(BenchmarkStore);
  actuation = () => this.store.selectedInstance().actuation;
  sim = () => this.store.selectedInstance().simulation;

  actuationOptions: ToggleOption<ActuationType>[] = [
    { value: 'progressive_squeeze', label: 'Progressive Squeeze' },
    { value: 'sudden_lockup', label: 'Sudden Lockup' }
  ];

  updateSimParam<K extends keyof ReturnType<typeof this.sim>>(key: K, val: number): void {
    const active = this.store.selectedInstance();
    this.store.updateSelectedInstance('simulation', {
      ...active.simulation,
      [key]: val
    });
  }
}
