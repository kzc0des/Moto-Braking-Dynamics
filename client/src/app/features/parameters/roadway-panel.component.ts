import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { SegmentedToggleComponent, ToggleOption } from '../../shared/ui/segmented-toggle.component';
import { ParamSliderComponent } from '../../shared/ui/param-slider.component';
import { SurfaceSubstrate, SurfaceContaminant } from '../../core/models/benchmark.types';

@Component({
  selector: 'app-roadway-panel',
  standalone: true,
  imports: [CommonModule, SegmentedToggleComponent, ParamSliderComponent],
  template: `
    <div class="flex flex-col gap-3 py-1">
      <!-- Surface Substrate -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs sm:text-sm font-semibold text-[#22201E]">Surface Substrate</label>
        <app-segmented-toggle
          [options]="substrateOptions"
          [value]="env().substrate"
          (valueChange)="store.updateEnvironmentParam('substrate', $event)"
        />
      </div>

      <!-- Surface Contaminant -->
      <div class="flex flex-col gap-1.5">
        <label class="text-xs sm:text-sm font-semibold text-[#22201E]">Surface Contaminant</label>
        <app-segmented-toggle
          [options]="contaminantOptions"
          [value]="env().contaminant"
          (valueChange)="store.updateEnvironmentParam('contaminant', $event)"
        />
      </div>

      <!-- Road Grade Incline Angle -->
      <app-param-slider
        label="Road Grade Angle (Incline)"
        symbol="θ"
        unit="rad"
        [min]="-0.20"
        [max]="0.20"
        [step]="0.01"
        [value]="env().roadGradeAngle"
        description="Longitudinal slope (>0 uphill, <0 downhill)"
        (valueChange)="store.updateEnvironmentParam('roadGradeAngle', $event)"
      />

      <!-- Pothole Void Defect Toggle -->
      <div class="flex items-center justify-between p-3 bg-[#FAF7F2] border border-[#E6DFD3] rounded-lg text-sm">
        <div>
          <span class="font-semibold text-[#22201E] text-xs sm:text-sm">Pothole Disturbance</span>
          <p class="text-xs text-[#6B645C]">Simulates normal load reduction at x = 15m</p>
        </div>
        <button
          type="button"
          (click)="togglePothole()"
          class="px-3 py-1 text-xs font-semibold rounded-md border transition-colors cursor-pointer"
          [ngClass]="env().potholeEnabled ? 'bg-[#FDEBE8] text-[#C93A30] border-[#F2554A]' : 'bg-white text-[#6B645C] border-[#E6DFD3]'"
        >
          {{ env().potholeEnabled ? 'ACTIVE' : 'OFF' }}
        </button>
      </div>
    </div>
  `
})
export class RoadwayPanelComponent {
  readonly store = inject(BenchmarkStore);
  env = () => this.store.selectedInstance().environment;

  substrateOptions: ToggleOption<SurfaceSubstrate>[] = [
    { value: 'asphalt', label: 'Asphalt' },
    { value: 'concrete', label: 'Concrete' },
    { value: 'gravel', label: 'Gravel' }
  ];

  contaminantOptions: ToggleOption<SurfaceContaminant>[] = [
    { value: 'dry', label: 'Dry' },
    { value: 'wet', label: 'Wet' },
    { value: 'dusty', label: 'Dusty' }
  ];

  togglePothole(): void {
    const cur = this.env().potholeEnabled;
    this.store.updateEnvironmentParam('potholeEnabled', !cur);
  }
}
