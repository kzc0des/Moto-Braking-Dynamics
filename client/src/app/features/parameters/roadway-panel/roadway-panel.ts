import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../../state/benchmark.store';
import { SegmentedToggle, ToggleOption } from '../../../shared/ui/segmented-toggle/segmented-toggle';
import { ParamSlider } from '../../../shared/ui/param-slider/param-slider';
import { SurfaceSubstrate, SurfaceContaminant } from '../../../core/models/benchmark.types';

@Component({
  selector: 'app-roadway-panel',
  imports: [CommonModule, SegmentedToggle, ParamSlider],
  templateUrl: './roadway-panel.html',
  styleUrl: './roadway-panel.css'
})
export class RoadwayPanel {
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
