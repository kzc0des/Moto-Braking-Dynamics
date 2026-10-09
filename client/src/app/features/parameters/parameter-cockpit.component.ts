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
      <div class="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        @for (inst of store.instances(); track inst.id) {
          <div
            class="flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-xs border cursor-pointer transition-all select-none"
            [style.borderColor]="store.selectedInstanceId() === inst.id ? inst.colorAccent : 'rgba(51, 65, 85, 0.7)'"
            [style.backgroundColor]="store.selectedInstanceId() === inst.id ? inst.colorAccent + '15' : 'rgba(2, 6, 23, 0.8)'"
            [style.boxShadow]="store.selectedInstanceId() === inst.id ? '0 0 10px ' + inst.colorAccent + '30' : 'none'"
            (click)="store.setSelectedInstanceId(inst.id)"
          >
            <!-- Sprite Idle Animation Preview -->
            <img
              [src]="'sprites/' + (inst.spriteKey || (inst.name.toLowerCase().includes('scooter') ? 'scooter' : inst.name.toLowerCase().includes('cruiser') ? 'cruiser' : 'ninja')) + '_idle_preview.gif'"
              class="w-7 h-4.5 object-contain shrink-0"
              [alt]="inst.name"
            />

            <!-- Color indicator dot -->
            <span
              class="w-2 h-2 rounded-full shrink-0"
              [style.backgroundColor]="inst.colorAccent"
            ></span>

            <!-- Instance Name with matching active color -->
            <span
              class="truncate font-bold"
              [style.color]="store.selectedInstanceId() === inst.id ? inst.colorAccent : '#cbd5e1'"
            >
              {{ inst.name }}
            </span>

            <!-- Enable/disable toggle with matching color -->
            <button
              type="button"
              (click)="$event.stopPropagation(); store.toggleInstanceEnabled(inst.id)"
              class="ml-1 text-[10px] px-1.5 py-0.5 rounded-xs border font-bold transition-all"
              [style.borderColor]="inst.enabled ? inst.colorAccent + '80' : 'rgba(51, 65, 85, 0.6)'"
              [style.color]="inst.enabled ? inst.colorAccent : '#64748b'"
              [style.backgroundColor]="inst.enabled ? inst.colorAccent + '20' : 'transparent'"
              title="Toggle inclusion in benchmark run"
            >
              {{ inst.enabled ? 'ON' : 'OFF' }}
            </button>
          </div>
        }
      </div>

      <!-- Pillar Selector Tabs with Active Instance Color Accent -->
      <div class="flex items-center gap-2 border-b border-slate-900 pb-1 text-xs font-mono">
        <button
          type="button"
          (click)="activePillar.set('chassis')"
          class="px-2 py-1 transition-colors border-b-2"
          [style.borderColor]="activePillar() === 'chassis' ? store.selectedInstance().colorAccent : 'transparent'"
          [style.color]="activePillar() === 'chassis' ? store.selectedInstance().colorAccent : '#94a3b8'"
        >
          1. Chassis & Geometry
        </button>
        <button
          type="button"
          (click)="activePillar.set('roadway')"
          class="px-2 py-1 transition-colors border-b-2"
          [style.borderColor]="activePillar() === 'roadway' ? store.selectedInstance().colorAccent : 'transparent'"
          [style.color]="activePillar() === 'roadway' ? store.selectedInstance().colorAccent : '#94a3b8'"
        >
          2. Roadway & Environment
        </button>
        <button
          type="button"
          (click)="activePillar.set('actuation')"
          class="px-2 py-1 transition-colors border-b-2"
          [style.borderColor]="activePillar() === 'actuation' ? store.selectedInstance().colorAccent : 'transparent'"
          [style.color]="activePillar() === 'actuation' ? store.selectedInstance().colorAccent : '#94a3b8'"
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
