import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { ParamSliderComponent } from '../../shared/ui/param-slider.component';

@Component({
  selector: 'app-chassis-panel',
  standalone: true,
  imports: [CommonModule, ParamSliderComponent],
  template: `
    <div class="flex flex-col gap-1">
      <app-param-slider
        label="Total Mass (Bike + Rider)"
        symbol="m"
        unit="kg"
        [min]="80"
        [max]="350"
        [step]="1"
        [value]="vehicle().mass"
        (valueChange)="store.updateVehicleParam('mass', $event)"
      />

      <app-param-slider
        label="Wheelbase"
        symbol="L"
        unit="m"
        [min]="1.10"
        [max]="1.80"
        [step]="0.01"
        [value]="vehicle().wheelbase"
        (valueChange)="store.updateVehicleParam('wheelbase', $event)"
      />

      <app-param-slider
        label="Center of Gravity Height"
        symbol="h"
        unit="m"
        [min]="0.35"
        [max]="0.85"
        [step]="0.01"
        [value]="vehicle().cogHeight"
        (valueChange)="store.updateVehicleParam('cogHeight', $event)"
      />

      <app-param-slider
        label="Brake Bias Ratio (Rear Split)"
        symbol="γ"
        unit=""
        [min]="0.0"
        [max]="1.0"
        [step]="0.05"
        [value]="vehicle().brakeBiasRatio"
        description="Fraction of braking effort directed to the rear wheel assembly"
        (valueChange)="store.updateVehicleParam('brakeBiasRatio', $event)"
      />

      <app-param-slider
        label="Wheel Rolling Radius"
        symbol="R_w"
        unit="m"
        [min]="0.20"
        [max]="0.40"
        [step]="0.01"
        [value]="vehicle().wheelRadius"
        (valueChange)="store.updateVehicleParam('wheelRadius', $event)"
      />
    </div>
  `
})
export class ChassisPanelComponent {
  readonly store = inject(BenchmarkStore);
  vehicle = () => this.store.selectedInstance().vehicle;
}
