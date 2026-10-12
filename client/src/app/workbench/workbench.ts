import { Component, inject, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../state/benchmark.store';
import { ThemeService } from '../core/services/theme.service';
import { FixedSidebar } from '../features/parameters/fixed-sidebar/fixed-sidebar';
import { PredictiveHorizon } from '../features/analytics/predictive-horizon/predictive-horizon';
import { KinematicsCanvas } from '../features/kinematics/kinematics-canvas/kinematics-canvas';
import { TelemetryPanel } from '../features/telemetry/telemetry-panel/telemetry-panel';
import { TrajectoryScrubber } from '../features/telemetry/trajectory-scrubber/trajectory-scrubber';

@Component({
  selector: 'app-workbench',
  imports: [
    CommonModule,
    FixedSidebar,
    PredictiveHorizon,
    KinematicsCanvas,
    TrajectoryScrubber,
    TelemetryPanel
  ],
  templateUrl: './workbench.html',
  styleUrl: './workbench.css'
})
export class Workbench {
  readonly store = inject(BenchmarkStore);
  readonly theme = inject(ThemeService);

  readonly currentMode = signal<'analytics' | 'simulation'>('analytics');
  readonly isMembersDrawerOpen = signal<boolean>(false);
  readonly isTelemetryOpen = signal<boolean>(false);

  readonly members = [
    { name: 'Vidal, Kenzo Shenel N.', initials: 'KV', role: 'Project Author & Lead Developer', isLead: true },
    { name: 'Agustin, Sandra C.', initials: 'SA', role: 'Research & Project Member', isLead: false },
    { name: 'Mamayson, Ferkeem F.', initials: 'FM', role: 'Research & Project Member', isLead: false },
    { name: 'Andres, Andrea R.', initials: 'AA', role: 'Research & Project Member', isLead: false },
    { name: 'Tenegra Jr., Antonio O.', initials: 'AT', role: 'Research & Project Member', isLead: false },
    { name: 'Española, Johnwell A.', initials: 'JE', role: 'Research & Project Member', isLead: false },
    { name: 'Tuba, John Michael S.', initials: 'JT', role: 'Research & Project Member', isLead: false },
    { name: 'Herrera, Timothy James A.', initials: 'TH', role: 'Research & Project Member', isLead: false },
  ];

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isMembersDrawerOpen()) {
      this.isMembersDrawerOpen.set(false);
    }
  }

  setMode(mode: 'analytics' | 'simulation'): void {
    this.currentMode.set(mode);
  }

  switchToSimulation(): void {
    this.currentMode.set('simulation');
    this.store.resetPlayback();
    this.store.triggerSimulation();
  }

  toggleMembersDrawer(): void {
    this.isMembersDrawerOpen.set(!this.isMembersDrawerOpen());
  }
}
