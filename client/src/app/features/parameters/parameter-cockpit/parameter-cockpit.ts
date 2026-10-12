import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../../state/benchmark.store';
import { ChassisPanel } from '../chassis-panel/chassis-panel';
import { RoadwayPanel } from '../roadway-panel/roadway-panel';
import { ActuationPanel } from '../actuation-panel/actuation-panel';

type PillarTab = 'chassis' | 'roadway' | 'actuation';

@Component({
  selector: 'app-parameter-cockpit',
  imports: [CommonModule, ChassisPanel, RoadwayPanel, ActuationPanel],
  templateUrl: './parameter-cockpit.html',
  styleUrl: './parameter-cockpit.css'
})
export class ParameterCockpit {
  readonly store = inject(BenchmarkStore);
  readonly activePillar = signal<PillarTab>('chassis');
}
