import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { ChassisPanelComponent } from './chassis-panel.component';
import { RoadwayPanelComponent } from './roadway-panel.component';
import { ActuationPanelComponent } from './actuation-panel.component';

type PillarTab = 'chassis' | 'roadway' | 'actuation';

@Component({
  selector: 'app-parameter-cockpit',
  standalone: true,
  imports: [CommonModule, ChassisPanelComponent, RoadwayPanelComponent, ActuationPanelComponent],
  template: `
    <div class="flex flex-col gap-3 p-4 bg-white border border-[#E6DFD3] rounded-xl shadow-xs select-none">
      <!-- Benchmark Instance Selector Badges -->
      <div class="flex items-center gap-2.5 border-b border-[#E6DFD3] pb-3 overflow-x-auto no-scrollbar">
        @for (inst of store.instances(); track inst.id) {
          <button
            type="button"
            class="flex items-center gap-2 px-3.5 py-1.5 text-xs rounded-lg border cursor-pointer transition-all select-none"
            [ngClass]="
              store.selectedInstanceId() === inst.id
                ? 'bg-[#FAF7F2] border-[#F2554A] shadow-2xs font-bold text-[#22201E]'
                : 'bg-white border-[#E6DFD3] hover:border-[#6B645C] font-medium text-[#6B645C]'
            "
            (click)="store.setSelectedInstanceId(inst.id)"
          >
            <!-- Color indicator dot -->
            <span
              class="w-2.5 h-2.5 rounded-full shrink-0"
              [style.backgroundColor]="inst.colorAccent"
            ></span>

            <!-- Instance Name -->
            <span class="truncate">
              {{ inst.name }}
            </span>
          </button>
        }
      </div>

      <!-- Pillar Selector Tabs -->
      <div class="flex items-center gap-3 border-b border-[#E6DFD3] pb-1 text-xs font-semibold">
        <button
          type="button"
          (click)="activePillar.set('chassis')"
          class="px-2 py-1.5 transition-colors border-b-2 cursor-pointer"
          [ngClass]="activePillar() === 'chassis' ? 'border-[#F2554A] text-[#22201E]' : 'border-transparent text-[#6B645C] hover:text-[#22201E]'"
        >
          1. Chassis & Geometry
        </button>
        <button
          type="button"
          (click)="activePillar.set('roadway')"
          class="px-2 py-1.5 transition-colors border-b-2 cursor-pointer"
          [ngClass]="activePillar() === 'roadway' ? 'border-[#F2554A] text-[#22201E]' : 'border-transparent text-[#6B645C] hover:text-[#22201E]'"
        >
          2. Roadway & Environment
        </button>
        <button
          type="button"
          (click)="activePillar.set('actuation')"
          class="px-2 py-1.5 transition-colors border-b-2 cursor-pointer"
          [ngClass]="activePillar() === 'actuation' ? 'border-[#F2554A] text-[#22201E]' : 'border-transparent text-[#6B645C] hover:text-[#22201E]'"
        >
          3. Actuation & Scenario
        </button>
      </div>

      <!-- Active Pillar Panel -->
      <div class="mt-1">
        @switch (activePillar()) {
          @case ('chassis') {
            <app-chassis-panel />
          }
          @case ('roadway') {
            <app-roadway-panel />
          }
          @case ('actuation') {
            <app-actuation-panel />
          }
        }
      </div>
    </div>
  `
})
export class ParameterCockpitComponent {
  readonly store = inject(BenchmarkStore);
  readonly activePillar = signal<PillarTab>('chassis');
}
