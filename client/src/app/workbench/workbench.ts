import { Component, inject, signal, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BenchmarkStore } from '../state/benchmark.store';
import { GarageService } from '../core/services/garage.service';
import { ThemeService } from '../core/services/theme.service';
import { DiagnosticsService } from '../features/diagnostics/diagnostics.service';
import { FixedSidebar } from '../features/parameters/fixed-sidebar/fixed-sidebar';
import { PredictiveHorizon } from '../features/analytics/predictive-horizon/predictive-horizon';
import { KinematicsCanvas } from '../features/kinematics/kinematics-canvas/kinematics-canvas';
import { TelemetryPanel } from '../features/telemetry/telemetry-panel/telemetry-panel';
import { TrajectoryScrubber } from '../features/telemetry/trajectory-scrubber/trajectory-scrubber';
import { DiagnosticsHud } from '../features/diagnostics/diagnostics-hud/diagnostics-hud';
import { SurfaceSubstrate, SurfaceContaminant } from '../core/models/benchmark.types';

@Component({
  selector: 'app-workbench',
  imports: [
    CommonModule,
    FixedSidebar,
    PredictiveHorizon,
    KinematicsCanvas,
    TrajectoryScrubber,
    TelemetryPanel,
    DiagnosticsHud
  ],
  templateUrl: './workbench.html',
  styleUrl: './workbench.css'
})
export class Workbench implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(BenchmarkStore);
  readonly garageService = inject(GarageService);
  readonly theme = inject(ThemeService);
  readonly diagnostics = inject(DiagnosticsService);

  readonly currentMode = signal<'analytics' | 'simulation'>('analytics');
  readonly isMembersDrawerOpen = signal<boolean>(false);
  readonly isSidebarOpen = signal<boolean>(false);
  readonly isTelemetryOpen = signal<boolean>(true);

  private routeSub?: Subscription;

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

  ngOnInit(): void {
    // 1. Initial tab & bikeId from route params
    const initialTab = this.route.snapshot.paramMap.get('tab') || this.route.snapshot.data['mode'];
    if (initialTab === 'simulation' || initialTab === 'analytics') {
      this.currentMode.set(initialTab);
    }

    // 2. React to route param changes (tab and bikeId switching without component remounting)
    const paramSub = this.route.paramMap.subscribe(params => {
      const tab = params.get('tab');
      if (tab === 'simulation' || tab === 'analytics') {
        this.currentMode.set(tab);
      }
      const bikeId = params.get('bikeId');
      if (bikeId && this.garageService.activeVehicleId() !== bikeId) {
        this.garageService.setActiveVehicle(bikeId);
      }
    });
    this.routeSub = paramSub;

    // 3. React to query parameter updates
    const qParamsSub = this.route.queryParamMap.subscribe(params => {
      // Panel state sync with guards to prevent redundant signal sets
      const panel = params.get('panel');
      if (panel === 'diagnostics') {
        if (!this.diagnostics.isHudOpen()) this.diagnostics.isHudOpen.set(true);
        if (this.isMembersDrawerOpen()) this.isMembersDrawerOpen.set(false);
      } else if (panel === 'team') {
        if (!this.isMembersDrawerOpen()) this.isMembersDrawerOpen.set(true);
        if (this.diagnostics.isHudOpen()) this.diagnostics.isHudOpen.set(false);
      } else {
        if (this.isMembersDrawerOpen()) this.isMembersDrawerOpen.set(false);
        if (this.diagnostics.isHudOpen()) this.diagnostics.isHudOpen.set(false);
      }

      // Environment state hydration
      const sub = params.get('substrate');
      if (sub === 'asphalt' || sub === 'concrete' || sub === 'gravel') {
        if (this.store.selectedInstance().environment.substrate !== sub) {
          this.store.updateEnvironmentParam('substrate', sub as SurfaceSubstrate);
        }
      }

      const con = params.get('contaminant');
      if (con === 'dry' || con === 'wet' || con === 'dusty') {
        if (this.store.selectedInstance().environment.contaminant !== con) {
          this.store.updateEnvironmentParam('contaminant', con as SurfaceContaminant);
        }
      }

      const grade = params.get('grade');
      if (grade !== null) {
        const deg = Number(grade);
        if (!isNaN(deg)) {
          const rad = Number(((deg * Math.PI) / 180).toFixed(4));
          if (this.store.selectedInstance().environment.roadGradeAngle !== rad) {
            this.store.updateEnvironmentParam('roadGradeAngle', rad);
          }
        }
      }
    });
    this.routeSub.add(qParamsSub);

    // 4. If environment parameters are missing from URL, ensure they are reflected
    const snapshotParams = this.route.snapshot.queryParamMap;
    const currentSub = this.store.selectedInstance().environment.substrate;
    const currentCon = this.store.selectedInstance().environment.contaminant;
    const currentGrade = Math.round((this.store.selectedInstance().environment.roadGradeAngle * 180) / Math.PI);

    const initialMissingParams: Record<string, any> = {};
    if (!snapshotParams.has('substrate')) initialMissingParams['substrate'] = currentSub;
    if (!snapshotParams.has('contaminant')) initialMissingParams['contaminant'] = currentCon;
    if (!snapshotParams.has('grade')) initialMissingParams['grade'] = currentGrade;

    if (Object.keys(initialMissingParams).length > 0) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: initialMissingParams,
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    }
  }

  ngOnDestroy(): void {
    this.routeSub?.unsubscribe();
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isMembersDrawerOpen()) {
      this.closeMembersDrawer();
    }
    if (this.isSidebarOpen()) {
      this.isSidebarOpen.set(false);
    }
  }

  setMode(mode: 'analytics' | 'simulation'): void {
    if (this.currentMode() === mode) return;

    this.currentMode.set(mode);

    const bikeId = this.garageService.activeVehicleId() || this.store.selectedInstance().id;
    const currentParams = this.route.snapshot.queryParams;

    // Filter query parameters strictly to prevent tangling across tabs:
    // Shared parameters: substrate, contaminant, grade, panel
    const targetParams: Record<string, any> = {};
    if (currentParams['substrate']) targetParams['substrate'] = currentParams['substrate'];
    if (currentParams['contaminant']) targetParams['contaminant'] = currentParams['contaminant'];
    if (currentParams['grade'] !== undefined) targetParams['grade'] = currentParams['grade'];
    if (currentParams['panel']) targetParams['panel'] = currentParams['panel'];

    // Analytics-only parameters (whatif, details, report) are ONLY included when navigating to analytics
    if (mode === 'analytics') {
      if (currentParams['whatif']) targetParams['whatif'] = currentParams['whatif'];
      if (currentParams['details']) targetParams['details'] = currentParams['details'];
      if (currentParams['report']) targetParams['report'] = currentParams['report'];
    }
    // Notice: When mode === 'simulation', analytics transient parameters are completely excluded!

    this.router.navigate(['/workbench', bikeId, mode], {
      queryParams: targetParams
    });
  }

  switchToSimulation(): void {
    this.isSidebarOpen.set(false);
    this.store.resetPlayback();
    this.store.triggerSimulation();
    this.setMode('simulation');
  }

  goToIntro(): void {
    this.router.navigate(['/setup'], { queryParams: { revisit: 1 } });
  }

  toggleSidebar(): void {
    this.isSidebarOpen.set(!this.isSidebarOpen());
  }

  toggleMembersDrawer(): void {
    const next = !this.isMembersDrawerOpen();
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { panel: next ? 'team' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  closeMembersDrawer(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { panel: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }
}
