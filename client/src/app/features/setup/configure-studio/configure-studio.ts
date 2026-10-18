import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { GarageService, getMaxSpeedForCc } from '../../../core/services/garage.service';
import { EMPIRICAL_PRESETS, EmpiricalPresetDescriptor } from '../../../core/models/archetype-defaults';
import { VehicleSpriteKey, AbsConfiguration } from '../../../core/models/benchmark.types';

export interface FamilyDescriptor {
  key: 'step_through' | 'standard' | 'supersport' | 'extended';
  label: string;
  desc: string;
  badge: string;
}

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

  /**
   * 4 Core Inertial Geometry Families grounded in Cossalter (2006) Chapter 1 & 7.
   */
  readonly families: FamilyDescriptor[] = [
    {
      key: 'step_through',
      label: 'Step-Through / Commuter',
      desc: 'Rear-biased CoG (b/L ≈ 0.42), low pitch-over, high commuter prevalence',
      badge: 'Rear-Biased CoG'
    },
    {
      key: 'standard',
      label: 'Standard / Roadster',
      desc: 'Neutral upright ergonomics (b/L ≈ 0.50), control dynamics benchmark',
      badge: 'Neutral Baseline'
    },
    {
      key: 'supersport',
      label: 'Supersport / Performance',
      desc: 'High h/L, short wheelbase, rear lift-off (stoppie) threshold critical',
      badge: 'Stoppie-Prone'
    },
    {
      key: 'extended',
      label: 'Extended Geometry',
      desc: 'Polar dynamics: long-wheelbase cruiser or tall long-travel adventure fork',
      badge: 'Polar Geometry'
    }
  ];

  readonly actuations = [
    { key: 'independent', label: 'Independent Controls', desc: 'Separate hand lever (front) and foot/hand control without linkage' },
    { key: 'cbs', label: 'Combi-Brake System (CBS)', desc: 'Rear actuation proportionally applies front caliper pressure' }
  ];

  readonly family = signal<'step_through' | 'standard' | 'supersport' | 'extended'>('step_through');
  readonly selectedPresetKey = signal<string>('scooter_125');

  readonly title = signal<string>('Custom 125cc Scooter');
  readonly displacementCc = signal<number>(125);
  readonly massKg = signal<number>(130);
  readonly frontBrake = signal<string>('single_disc');
  readonly rearBrake = signal<string>('drum');
  readonly actuation = signal<string>('cbs');
  readonly absConfiguration = signal<AbsConfiguration>('none');

  // Tier 2 parameters
  readonly isTier2Open = signal<boolean>(false);
  readonly wheelbase = signal<number>(1.28);
  readonly cogHeight = signal<number>(0.48);
  readonly rotorDiameterMm = signal<number>(220);
  readonly padFriction = signal<number>(0.35);
  readonly fluidBoilTemp = signal<number>(210);

  readonly activePresets = computed(() => {
    const famKey = this.family();
    return EMPIRICAL_PRESETS.filter(p => p.familyKey === famKey);
  });

  readonly activePreset = computed(() => {
    const key = this.selectedPresetKey();
    return EMPIRICAL_PRESETS.find(p => p.key === key) ?? EMPIRICAL_PRESETS[0];
  });

  readonly stockFrontBrake = computed<'single_disc' | 'dual_disc'>(() => {
    return this.activePreset().frontBrake === 'dual_disc' ? 'dual_disc' : 'single_disc';
  });

  readonly stockRearBrake = computed<'drum' | 'disc'>(() => {
    return this.activePreset().rearBrake === 'drum' ? 'drum' : 'disc';
  });

  readonly isRearDrum = computed(() => this.rearBrake() === 'drum');
  readonly isMechanicalLinkageLocked = computed(() => this.absConfiguration() === 'dual_channel');

  readonly activeSpriteKey = computed<Exclude<VehicleSpriteKey, 'ninja'>>(() => {
    const presetKey = this.selectedPresetKey();
    const foundPreset = EMPIRICAL_PRESETS.find(p => p.key === presetKey);
    if (foundPreset) {
      return foundPreset.spriteKey === 'ninja' ? 'supersport' : foundPreset.spriteKey;
    }
    const fam = this.family();
    if (fam === 'step_through') return 'scooter';
    if (fam === 'standard') return 'naked';
    if (fam === 'supersport') return 'supersport';
    if (fam === 'extended') return this.wheelbase() > 1.50 ? 'cruiser' : 'adventure';
    return 'naked';
  });

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
        this.title.set(target.title);
        this.displacementCc.set(target.displacementCc);
        this.massKg.set(target.massKg);
        this.frontBrake.set(target.frontBrake);
        this.rearBrake.set(target.rearBrake);

        const defaultAbs: AbsConfiguration = target.absConfiguration ?? (target.actuation === 'abs' ? (target.rearBrake === 'drum' ? 'single_channel_front' : 'dual_channel') : 'none');
        const resolvedAbs: AbsConfiguration = target.rearBrake === 'drum' && defaultAbs === 'dual_channel' ? 'single_channel_front' : defaultAbs;
        this.absConfiguration.set(resolvedAbs);

        if (resolvedAbs === 'dual_channel') {
          this.actuation.set('independent');
        } else {
          this.actuation.set(target.actuation);
        }

        this.wheelbase.set(target.wheelbase);
        this.cogHeight.set(target.cogHeight);
        this.rotorDiameterMm.set(target.rotorDiameterMm);
        this.padFriction.set(target.padFriction);
        this.fluidBoilTemp.set(target.fluidBoilTemp);

        // Map legacy or current category to family
        const cat = target.category;
        if (cat === 'scooter' || cat === 'underbone' || cat === 'step_through') {
          this.family.set('step_through');
        } else if (cat === 'naked' || cat === 'standard') {
          this.family.set('standard');
        } else if (cat === 'sport' || cat === 'supersport') {
          this.family.set('supersport');
        } else if (cat === 'extended' || cat === 'cruiser' || cat === 'adventure') {
          this.family.set('extended');
        }
      }
    } else if (mode === 'new') {
      this.editingVehicleId.set(null);
      this.title.set('Custom Build');
    }
  }

  selectFamily(famKey: 'step_through' | 'standard' | 'supersport' | 'extended'): void {
    this.family.set(famKey);
    const presets = EMPIRICAL_PRESETS.filter(p => p.familyKey === famKey);
    if (presets.length > 0) {
      this.applyPreset(presets[0]);
    }
  }

  applyPreset(preset: EmpiricalPresetDescriptor): void {
    this.selectedPresetKey.set(preset.key);
    this.title.set(preset.name);
    this.displacementCc.set(preset.displacementCc);
    this.massKg.set(preset.massKg);
    this.wheelbase.set(preset.wheelbase);
    this.cogHeight.set(preset.cogHeight);
    this.frontBrake.set(preset.frontBrake);
    this.rearBrake.set(preset.rearBrake);
    this.rotorDiameterMm.set(preset.rotorDiameterMm);
    this.padFriction.set(preset.padFriction);
    this.fluidBoilTemp.set(preset.fluidBoilTemp);

    // Align ABS secondary configuration based on preset defaults
    if (preset.actuation === 'abs') {
      const absCfg: AbsConfiguration = preset.rearBrake === 'drum' ? 'single_channel_front' : 'dual_channel';
      this.absConfiguration.set(absCfg);
      this.actuation.set('independent');
    } else {
      this.absConfiguration.set('none');
      this.actuation.set(preset.actuation === 'cbs' ? 'cbs' : 'independent');
    }
  }

  setAbsConfiguration(cfg: AbsConfiguration): void {
    if (cfg === 'dual_channel' && this.isRearDrum()) {
      return;
    }
    this.absConfiguration.set(cfg);
    if (cfg === 'dual_channel') {
      this.actuation.set('independent');
    }
  }

  selectActuation(actKey: string): void {
    if (this.isMechanicalLinkageLocked()) {
      return;
    }
    this.actuation.set(actKey);
  }

  updateTitle(val: string): void {
    this.title.set(val);
  }

  updateDisplacement(val: number | string): void {
    const cc = Number(val);
    this.displacementCc.set(cc);
    if (cc <= 150 && this.massKg() > 200) {
      this.massKg.set(130);
    } else if (cc > 500 && this.massKg() < 180) {
      this.massKg.set(200);
    }
  }

  updateMass(val: number | string): void {
    this.massKg.set(Number(val));
  }

  updateWheelbase(val: number | string): void {
    this.wheelbase.set(Number(val));
  }

  updateCogHeight(val: number | string): void {
    this.cogHeight.set(Number(val));
  }

  updateRotorDiameter(val: number | string): void {
    this.rotorDiameterMm.set(Number(val));
  }

  updatePadFriction(val: number | string): void {
    this.padFriction.set(Number(val));
  }

  updateFluidBoilTemp(val: number | string): void {
    this.fluidBoilTemp.set(Number(val));
  }

  goBack(): void {
    // Always go to the intro page; ?revisit keeps it open even when a vehicle is already saved.
    this.router.navigate(['/setup'], { queryParams: { revisit: 1 } });
  }

  saveAndLaunch(): void {
    const payload = {
      category: this.family(),
      title: this.title(),
      spriteKey: this.activeSpriteKey(),
      displacementCc: this.displacementCc(),
      massKg: this.massKg(),
      frontBrake: this.frontBrake(),
      rearBrake: this.rearBrake(),
      actuation: this.actuation(),
      absConfiguration: this.absConfiguration(),
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
