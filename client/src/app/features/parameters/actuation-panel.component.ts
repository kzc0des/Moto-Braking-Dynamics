import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { SegmentedToggleComponent, ToggleOption } from '../../shared/ui/segmented-toggle.component';
import { ParamSliderComponent } from '../../shared/ui/param-slider.component';
import { ActuationType } from '../../core/models/benchmark.types';

@Component({
  selector: 'app-actuation-panel',
  standalone: true,
  imports: [CommonModule, SegmentedToggleComponent, ParamSliderComponent],
  template: `
    <div class="flex flex-col gap-3 py-1">
      <!-- Actuation Profile Strategy -->
      <div class="flex flex-col gap-1">
        <label class="text-xs font-medium text-slate-300">Actuation Profile Strategy</label>
        <app-segmented-toggle
          [options]="actuationOptions"
          [value]="actuation().type"
          (valueChange)="store.updateActuationParam('type', $event)"
        />
      </div>

      <!-- Initial Velocity v_0 -->
      <app-param-slider
        label="Initial Velocity"
        symbol="v_0"
        unit="m/s"
        [min]="5.0"
        [max]="50.0"
        [step]="0.5"
        [value]="sim().initialVelocity"
        description="Entry speed (e.g. 16.7 m/s ≈ 60 km/h, 27.8 m/s ≈ 100 km/h)"
        (valueChange)="updateSimParam('initialVelocity', $event)"
      />

      <!-- Hazard Distance X_hazard -->
      <app-param-slider
        label="Hazard Barrier Distance"
        symbol="X_hazard"
        unit="m"
        [min]="15.0"
        [max]="100.0"
        [step]="1.0"
        [value]="sim().hazardDistance"
        description="Immovable barrier threshold for collision classification"
        (valueChange)="updateSimParam('hazardDistance', $event)"
      />

      <!-- Clamping Hydraulic Pressure -->
      <app-param-slider
        label="Target Brake Line Pressure"
        symbol="P_target"
        unit="bar"
        [min]="10"
        [max]="100"
        [step]="1"
        [value]="actuation().targetPressure / 1e5"
        (valueChange)="store.updateActuationParam('targetPressure', $event * 1e5)"
      />

      <!-- Rise Time (if Progressive Squeeze) -->
      @if (actuation().type === 'progressive_squeeze') {
        <app-param-slider
          label="Brake Lever Rise Time"
          symbol="t_rise"
          unit="s"
          [min]="0.10"
          [max]="1.20"
          [step]="0.05"
          [value]="actuation().riseTime"
          description="Ramp duration from zero to maximum caliper pressure"
          (valueChange)="store.updateActuationParam('riseTime', $event)"
        />
      }
    </div>
  `
})
export class ActuationPanelComponent {
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
