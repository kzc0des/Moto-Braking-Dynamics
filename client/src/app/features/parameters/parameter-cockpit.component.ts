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
    <div class="flex flex-col gap-2 p-3 bg-slate-950 border border-slate-800 rounded-sm">
      <!-- Benchmark Instance Tabs -->
      <div class="flex items-center gap-1.5 border-b border-slate-800 pb-2">
        @for (inst of store.instances(); track inst.id) {
          <div
            class="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-xs border cursor-pointer transition-colors"
            [ngClass]="
              store.selectedInstanceId() === inst.id
                ? 'bg-slate-900 border-amber-500/50 text-slate-100 font-bold'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            "
            (click)="store.setSelectedInstanceId(inst.id)"
          >
            <!-- Color indicator dot -->
            <span
              class="w-2 h-2 rounded-full"
              [style.backgroundColor]="inst.colorAccent"
            ></span>
            <span class="truncate">{{ inst.name }}</span>

            <!-- Enable/disable toggle -->
            <button
              type="button"
              (click)="$event.stopPropagation(); store.toggleInstanceEnabled(inst.id)"
              class="ml-1 text-[10px] px-1 rounded-xs border"
              [ngClass]="
                inst.enabled
                  ? 'text-emerald-400 border-emerald-500/40 bg-emerald-950/20'
                  : 'text-slate-600 border-slate-800 bg-slate-950'
              "
              title="Toggle inclusion in benchmark run"
            >
              {{ inst.enabled ? 'ON' : 'OFF' }}
            </button>
          </div>
        }
      </div>

      <!-- Pillar Selector Tabs -->
      <div class="flex items-center gap-2 border-b border-slate-900 pb-1 text-xs font-mono">
        <button
          type="button"
          (click)="activePillar.set('chassis')"
          class="px-2 py-1 transition-colors"
          [ngClass]="activePillar() === 'chassis' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-200'"
        >
          1. Chassis & Geometry
        </button>
        <button
          type="button"
          (click)="activePillar.set('roadway')"
          class="px-2 py-1 transition-colors"
          [ngClass]="activePillar() === 'roadway' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-200'"
        >
          2. Roadway & Environment
        </button>
        <button
          type="button"
          (click)="activePillar.set('actuation')"
          class="px-2 py-1 transition-colors"
          [ngClass]="activePillar() === 'actuation' ? 'text-amber-400 font-bold border-b-2 border-amber-400' : 'text-slate-400 hover:text-slate-200'"
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
