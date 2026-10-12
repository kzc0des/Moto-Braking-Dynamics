import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { GarageService, getMaxSpeedForCc } from '../../../core/services/garage.service';

@Component({
  selector: 'app-configure-studio',
  imports: [CommonModule, FormsModule],
  templateUrl: './configure-studio.html',
  styleUrl: './configure-studio.css'
})
export class ConfigureStudio implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly garageService = inject(GarageService);

  readonly editingVehicleId = signal<string | null>(null);
  readonly isEditMode = computed(() => this.editingVehicleId() !== null);

  readonly categories = [
    { key: 'scooter', label: 'Scooter / Step-Through', desc: 'Enclosed engine, automatic, relaxed pitch' },
    { key: 'underbone', label: 'Underbone / Moped', desc: 'Lightweight backbone, commuter efficiency' },
    { key: 'naked', label: 'Standard / Naked', desc: 'Upright geometry, medium displacement' },
    { key: 'sport', label: 'Sport / Superbike', desc: 'Aggressive pitch, high deceleration bite' }
  ];

  readonly actuations = [
    { key: 'independent', label: 'Independent Levers', desc: 'Standard manual modulation without electronic coupling' },
    { key: 'cbs', label: 'Combi-Brake System (CBS)', desc: 'Rear lever proportionally actuates front caliper' },
    { key: 'abs', label: 'Anti-lock Braking System (ABS)', desc: 'Hydraulic pressure modulation prevents critical wheel lock' }
  ];

  readonly category = signal<string>('scooter');
  readonly title = signal<string>('Custom 125cc Scooter');
  readonly displacementCc = signal<number>(125);
  readonly massKg = signal<number>(165);
  readonly frontBrake = signal<string>('single_disc');
  readonly rearBrake = signal<string>('drum');
  readonly actuation = signal<string>('independent');

  // Tier 2 parameters
  readonly isTier2Open = signal<boolean>(false);
  readonly wheelbase = signal<number>(1.28);
  readonly cogHeight = signal<number>(0.62);
  readonly rotorDiameterMm = signal<number>(220);
  readonly padFriction = signal<number>(0.35);
  readonly fluidBoilTemp = signal<number>(230);

  readonly maxSpeedKmh = computed(() => getMaxSpeedForCc(this.displacementCc()));

  readonly svgCoords = computed(() => {
    const wb = this.wheelbase();
    const rx = 50;
    const fx = Math.round(rx + (wb / 1.5) * 160);
    const cx = Math.round((rx + fx) / 2);
    const cy = 54;
    return {
      rx,
      fx,
      cx,
      cy,
      cyTop: cy - 7,
      cyBot: cy + 7,
      seatA: rx + 24,
      seatB: cx + 18,
      frame: `${rx},66 ${rx + 30},46 ${cx + 15},44 ${fx - 24},38 ${fx},66`
    };
  });

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    const id = this.route.snapshot.queryParamMap.get('id');

    if (mode === 'edit' || (id && mode !== 'new')) {
      const target = id ? this.garageService.getVehicleById(id) : this.garageService.activeVehicle();
      if (target) {
        this.editingVehicleId.set(target.id);
        this.category.set(target.category);
        this.title.set(target.title);
        this.displacementCc.set(target.displacementCc);
        this.massKg.set(target.massKg);
        this.frontBrake.set(target.frontBrake);
        this.rearBrake.set(target.rearBrake);
        this.actuation.set(target.actuation);
        this.wheelbase.set(target.wheelbase);
        this.cogHeight.set(target.cogHeight);
        this.rotorDiameterMm.set(target.rotorDiameterMm);
        this.padFriction.set(target.padFriction);
        this.fluidBoilTemp.set(target.fluidBoilTemp);
      }
    } else if (mode === 'new') {
      this.editingVehicleId.set(null);
      this.title.set('Custom Build');
    }
  }

  selectCategory(key: string): void {
    this.category.set(key);
    if (key === 'scooter') {
      this.title.set('Custom 125cc Scooter');
      this.displacementCc.set(125);
      this.massKg.set(165);
      this.wheelbase.set(1.28);
      this.cogHeight.set(0.62);
      this.rearBrake.set('drum');
      this.rotorDiameterMm.set(220);
    } else if (key === 'underbone') {
      this.title.set('Custom 125cc Underbone');
      this.displacementCc.set(125);
      this.massKg.set(125);
      this.wheelbase.set(1.22);
      this.cogHeight.set(0.60);
      this.rearBrake.set('drum');
      this.rotorDiameterMm.set(220);
    } else if (key === 'naked') {
      this.title.set('Custom 400cc Naked');
      this.displacementCc.set(400);
      this.massKg.set(195);
      this.wheelbase.set(1.38);
      this.cogHeight.set(0.62);
      this.rearBrake.set('disc');
      this.rotorDiameterMm.set(290);
    } else if (key === 'sport') {
      this.title.set('Custom 600cc Superbike');
      this.displacementCc.set(600);
      this.massKg.set(200);
      this.wheelbase.set(1.42);
      this.cogHeight.set(0.58);
      this.frontBrake.set('dual_disc');
      this.rearBrake.set('disc');
      this.rotorDiameterMm.set(320);
    }
  }

  onDisplacementChange(cc: number): void {
    // Dynamic weight recommendation
    if (cc <= 150 && this.massKg() > 200) {
      this.massKg.set(150);
    } else if (cc > 500 && this.massKg() < 180) {
      this.massKg.set(210);
    }
  }

  goBack(): void {
    if (this.garageService.hasVehicles()) {
      this.router.navigate(['/workbench']);
    } else {
      this.router.navigate(['/setup']);
    }
  }

  saveAndLaunch(): void {
    const payload = {
      category: this.category(),
      title: this.title(),
      displacementCc: this.displacementCc(),
      massKg: this.massKg(),
      frontBrake: this.frontBrake(),
      rearBrake: this.rearBrake(),
      actuation: this.actuation(),
      wheelbase: this.wheelbase(),
      cogHeight: this.cogHeight(),
      rotorDiameterMm: this.rotorDiameterMm(),
      padFriction: this.padFriction(),
      fluidBoilTemp: this.fluidBoilTemp()
    };

    if (this.isEditMode() && this.editingVehicleId()) {
      this.garageService.updateVehicle(this.editingVehicleId()!, payload);
    } else {
      this.garageService.addVehicle(payload);
    }

    this.router.navigate(['/workbench']);
  }
}
