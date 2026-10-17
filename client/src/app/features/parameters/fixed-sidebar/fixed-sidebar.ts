import { Component, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { BenchmarkStore } from '../../../state/benchmark.store';
import { GarageService } from '../../../core/services/garage.service';
import { SurfaceSubstrate, SurfaceContaminant } from '../../../core/models/benchmark.types';

@Component({
  selector: 'app-fixed-sidebar',
  imports: [CommonModule, FormsModule],
  templateUrl: './fixed-sidebar.html',
  styleUrl: './fixed-sidebar.css'
})
export class FixedSidebar {
  private readonly router = inject(Router);
  readonly store = inject(BenchmarkStore);
  readonly garageService = inject(GarageService);
  readonly isTier2Open = signal<boolean>(false);
  readonly openGroups = signal<Record<string, boolean>>({ kin: true, brake: true, road: true });

  isOpen(key: string): boolean {
    return !!this.openGroups()[key];
  }

  toggleGroup(key: string): void {
    this.openGroups.update(g => ({ ...g, [key]: !g[key] }));
  }

  readonly garageVehicles = computed(() => this.garageService.vehicles());
  readonly activeVehicleId = computed(() => this.garageService.activeVehicleId());
  readonly activeVehicle = computed(() => this.garageService.activeVehicle());
  readonly displacementCc = computed(() => this.activeVehicle()?.displacementCc ?? 125);
  readonly maxSpeedKmh = computed(() => this.garageService.activeMaxSpeedKmh());

  readonly substrates = [
    { key: 'asphalt' as SurfaceSubstrate, label: 'Asphalt' },
    { key: 'concrete' as SurfaceSubstrate, label: 'Concrete' },
    { key: 'gravel' as SurfaceSubstrate, label: 'Gravel' }
  ];

  readonly contaminants = [
    { key: 'dry' as SurfaceContaminant, label: 'Dry' },
    { key: 'wet' as SurfaceContaminant, label: 'Wet' },
    { key: 'dusty' as SurfaceContaminant, label: 'Painted' }
  ];

  readonly selectedInst = computed(() => this.store.selectedInstance());
  readonly vehicleTitle = computed(() => this.selectedInst().name);
  readonly mass = computed(() => this.selectedInst().vehicle.mass);
  readonly wheelbase = computed(() => this.selectedInst().vehicle.wheelbase.toFixed(2));
  readonly cogHeight = computed(() => this.selectedInst().vehicle.cogHeight.toFixed(2));
  readonly rotorDiameter = computed(() => Math.round(this.selectedInst().brake.effectiveRadius * 2000));
  readonly padFriction = computed(() => this.selectedInst().brake.padFrictionNominal.toFixed(2));
  readonly brakeBias = computed(() => Math.round((1 - this.selectedInst().vehicle.brakeBiasRatio) * 100));

  readonly brakeHardwareLabel = computed(() => {
    const rear = this.selectedInst().brake.brakeType === 'drum' ? 'Drum' : 'Disc';
    return `Front Disc / Rear ${rear}`;
  });

  readonly speedKmh = computed(() => Math.round(this.selectedInst().simulation.initialVelocity * 3.6));
  readonly speedMs = computed(() => this.selectedInst().simulation.initialVelocity.toFixed(1));
  readonly hazardDistance = computed(() => this.selectedInst().simulation.hazardDistance);

  readonly activeSubstrate = computed(() => this.selectedInst().environment.substrate);
  readonly activeContaminant = computed(() => this.selectedInst().environment.contaminant);
  readonly gradeDeg = computed(() => Math.round(this.selectedInst().environment.roadGradeAngle * 180 / Math.PI));

  // SVG Coordinates calculation based on wheelbase
  readonly svgCoords = computed(() => {
    const wb = this.selectedInst().vehicle.wheelbase;
    const rx = 48;
    const fx = Math.round(rx + (wb / 1.5) * 160);
    const cx = Math.round((rx + fx) / 2);
    const cy = 52;
    return {
      rx,
      fx,
      cx,
      cy,
      cyTop: cy - 7,
      cyBot: cy + 7,
      seatA: rx + 24,
      seatB: cx + 18,
      frame: `${rx},64 ${rx + 30},44 ${cx + 15},42 ${fx - 24},36 ${fx},64`
    };
  });

  onSelectVehicle(id: string): void {
    this.garageService.setActiveVehicle(id);
  }

  editConfiguration(): void {
    const activeId = this.garageService.activeVehicleId();
    this.router.navigate(['/configure'], { queryParams: { mode: 'edit', id: activeId } });
  }

  createAnotherMotorcycle(): void {
    this.router.navigate(['/configure'], { queryParams: { mode: 'new' } });
  }

  onSpeedChange(valKmh: number | string): void {
    const num = Number(valKmh);
    const maxAllowed = this.maxSpeedKmh();
    const clamped = Math.min(Math.max(num, 20), maxAllowed);
    const v0 = Number((clamped / 3.6).toFixed(2));
    this.store.updateSelectedInstance('simulation', {
      ...this.selectedInst().simulation,
      initialVelocity: v0
    });
    const activeId = this.garageService.activeVehicleId();
    if (activeId) {
      this.garageService.updateKinematics(activeId, { initialVelocity: v0 });
    }
  }

  onHazardChange(valM: number | string): void {
    const num = Number(valM);
    if (num >= 10 && num <= 80) {
      this.store.updateSelectedInstance('simulation', {
        ...this.selectedInst().simulation,
        hazardDistance: num
      });
      const activeId = this.garageService.activeVehicleId();
      if (activeId) {
        this.garageService.updateKinematics(activeId, { hazardDistance: num });
      }
    }
  }

  onSubstrateChange(sub: SurfaceSubstrate): void {
    this.store.updateEnvironmentParam('substrate', sub);
  }

  onContaminantChange(con: SurfaceContaminant): void {
    this.store.updateEnvironmentParam('contaminant', con);
  }

  readonly frontLeverPct = computed(() => this.selectedInst().actuation.frontLeverPct ?? 85);
  readonly rearControlPct = computed(() => this.selectedInst().actuation.rearControlPct ?? 65);
  readonly frontPressureMpa = computed(() => ((this.frontLeverPct() / 100) * 6.5).toFixed(1));
  readonly rearPressureMpa = computed(() => ((this.rearControlPct() / 100) * 5.0).toFixed(1));

  readonly rearControlLabel = computed(() => {
    const key = this.selectedInst().spriteKey;
    return (key === 'scooter' || key === 'maxi') ? 'Left Hand Lever' : 'Right Foot Pedal';
  });

  readonly rearControlSubtext = computed(() => {
    const key = this.selectedInst().spriteKey;
    return (key === 'scooter' || key === 'maxi') ? 'Hand Lever (Scooter)' : 'Foot Pedal (Manual)';
  });

  onFrontLeverChange(val: number | string): void {
    const num = Math.min(100, Math.max(0, Number(val)));
    this.store.updateActuationParam('frontLeverPct', num);
    const activeId = this.garageService.activeVehicleId();
    if (activeId) {
      this.garageService.updateKinematics(activeId, { frontLeverPct: num });
    }
  }

  onRearControlChange(val: number | string): void {
    const num = Math.min(100, Math.max(0, Number(val)));
    this.store.updateActuationParam('rearControlPct', num);
    const activeId = this.garageService.activeVehicleId();
    if (activeId) {
      this.garageService.updateKinematics(activeId, { rearControlPct: num });
    }
  }

  onGradeChange(deg: number | string): void {
    const num = Number(deg);
    const rad = Number((num * Math.PI / 180).toFixed(4));
    this.store.updateEnvironmentParam('roadGradeAngle', rad);
  }
}
