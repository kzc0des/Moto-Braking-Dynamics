import { Component, inject, signal, computed, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { GarageService, getMaxSpeedForCc } from '../../../core/services/garage.service';
import { EMPIRICAL_PRESETS, EmpiricalPresetDescriptor } from '../../../core/models/archetype-defaults';
import { VehicleSpriteKey, AbsConfiguration } from '../../../core/models/benchmark.types';

export interface FamilyDescriptor {
  key: 'step_through' | 'standard' | 'supersport' | 'extended';
  label: string;
  desc: string;
  /** Plain-English description shown by default. */
  plain: string;
  badge: string;
  /** Recognisable production models across the family's presets. */
  models: string[];
}

/** Up to `limit` real-world models for a family, taking one from each preset in turn. */
function familyModelSamples(familyKey: FamilyDescriptor['key'], limit = 3): string[] {
  const lists = EMPIRICAL_PRESETS.filter(p => p.familyKey === familyKey).map(p => p.models);
  const picked: string[] = [];
  for (let i = 0; picked.length < limit && lists.some(list => i < list.length); i++) {
    for (const list of lists) {
      if (i < list.length && picked.length < limit) {
        picked.push(list[i]);
      }
    }
  }
  return picked;
}

@Component({
  selector: 'app-configure-studio',
  imports: [CommonModule, FormsModule],
  templateUrl: './configure-studio.html',
  styleUrl: './configure-studio.css'
})
export class ConfigureStudio implements OnInit, OnDestroy {
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
      plain: 'Scooters and city commuters. Most of the weight sits toward the back, so they rarely tip forward when braking.',
      badge: 'Rear-Biased CoG',
      models: familyModelSamples('step_through')
    },
    {
      key: 'standard',
      label: 'Standard / Roadster',
      desc: 'Neutral upright ergonomics (b/L ≈ 0.50), control dynamics benchmark',
      plain: 'Everyday upright bikes. Weight is balanced front to back, so this is the standard reference.',
      badge: 'Neutral Baseline',
      models: familyModelSamples('standard')
    },
    {
      key: 'supersport',
      label: 'Supersport / Performance',
      desc: 'High h/L, short wheelbase, rear lift-off (stoppie) threshold critical',
      plain: 'Sport bikes. Tall and short, so very hard front braking can lift the rear wheel off the ground.',
      badge: 'Stoppie-Prone',
      models: familyModelSamples('supersport')
    },
    {
      key: 'extended',
      label: 'Extended Geometry',
      desc: 'Polar dynamics: long-wheelbase cruiser or tall long-travel adventure fork',
      plain: 'Cruisers and adventure bikes. Long and stretched out, with a tall front fork.',
      badge: 'Polar Geometry',
      models: familyModelSamples('extended')
    }
  ];

  readonly actuations = [
    { key: 'independent', label: 'Independent controls', desc: 'Front and rear brakes work separately. You squeeze or press each one yourself.' },
    { key: 'cbs', label: 'Linked brakes (CBS)', desc: 'Using the rear brake control also applies some front brake, so one input stops the bike more evenly.' }
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
  /** Technical labels, formulas and jargon are hidden until the user asks for them. */
  readonly showTechnical = signal<boolean>(false);
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

  private querySub?: Subscription;

  ngOnInit(): void {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    const bikeId = this.route.snapshot.queryParamMap.get('bikeId') || this.route.snapshot.queryParamMap.get('id');
    const typeParam = this.route.snapshot.queryParamMap.get('type');
    const modelParam = this.route.snapshot.queryParamMap.get('model');
    const absParam = this.route.snapshot.queryParamMap.get('abs');
    const actParam = this.route.snapshot.queryParamMap.get('actuation');

    const parsedAbs = this.parseAbsParam(absParam);
    const parsedAct = this.parseActuationParam(actParam);

    if (mode === 'edit' || (bikeId && mode !== 'new')) {
      const target = bikeId ? this.garageService.getVehicleById(bikeId) : this.garageService.activeVehicle();
      if (!target) {
        this.router.navigate(['/not-found'], { queryParams: { reason: 'vehicle', id: bikeId ?? 'unknown' } });
        return;
      }

      this.editingVehicleId.set(target.id);
      this.title.set(target.title);
      this.displacementCc.set(target.displacementCc);
      this.massKg.set(target.massKg);
      this.frontBrake.set(target.frontBrake);
      this.rearBrake.set(target.rearBrake);

      const defaultAbs: AbsConfiguration = target.absConfiguration ?? (target.actuation === 'abs' ? (target.rearBrake === 'drum' ? 'single_channel_front' : 'dual_channel') : 'none');
      let resolvedAbs: AbsConfiguration = parsedAbs ?? defaultAbs;
      if (target.rearBrake === 'drum' && resolvedAbs === 'dual_channel') {
        resolvedAbs = 'single_channel_front';
      }
      this.absConfiguration.set(resolvedAbs);

      if (resolvedAbs === 'dual_channel') {
        this.actuation.set('independent');
      } else {
        this.actuation.set(parsedAct ?? target.actuation);
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

      this.syncQueryParams();
    } else {
      this.editingVehicleId.set(null);
      this.title.set('Custom Build');

      const parsedFamily = this.parseFamilySlug(typeParam);
      if (parsedFamily) {
        this.family.set(parsedFamily);
      }

      let matchedPreset: EmpiricalPresetDescriptor | undefined;
      if (modelParam) {
        const normalized = modelParam.replace(/-/g, '_').toLowerCase();
        matchedPreset = EMPIRICAL_PRESETS.find(
          p => p.key.toLowerCase() === normalized || p.key.toLowerCase().replace(/_/g, '-') === modelParam.toLowerCase()
        );
      }

      if (!matchedPreset && parsedFamily) {
        const presets = EMPIRICAL_PRESETS.filter(p => p.familyKey === parsedFamily);
        if (presets.length > 0) {
          matchedPreset = presets[0];
        }
      }

      if (!matchedPreset) {
        matchedPreset = EMPIRICAL_PRESETS[0];
      }

      if (matchedPreset) {
        this.family.set(matchedPreset.familyKey);
        this.applyPreset(matchedPreset, false);
      }

      // If abs or actuation was explicitly supplied in URL query params, hydrate them
      if (parsedAbs) {
        if (this.isRearDrum() && parsedAbs === 'dual_channel') {
          this.absConfiguration.set('single_channel_front');
        } else {
          this.absConfiguration.set(parsedAbs);
        }
      }

      if (this.isMechanicalLinkageLocked()) {
        this.actuation.set('independent');
      } else if (parsedAct) {
        this.actuation.set(parsedAct);
      }

      this.syncQueryParams();
    }

    // Subscribe to queryParam updates to support browser Back / Forward history
    this.querySub = this.route.queryParamMap.subscribe(params => {
      const qAbs = this.parseAbsParam(params.get('abs'));
      const qAct = this.parseActuationParam(params.get('actuation'));

      if (qAbs && qAbs !== this.absConfiguration()) {
        if (!(qAbs === 'dual_channel' && this.isRearDrum())) {
          this.absConfiguration.set(qAbs);
        }
      }

      if (this.isMechanicalLinkageLocked()) {
        if (this.actuation() !== 'independent') {
          this.actuation.set('independent');
        }
      } else if (qAct && qAct !== this.actuation()) {
        this.actuation.set(qAct);
      }
    });
  }

  ngOnDestroy(): void {
    this.querySub?.unsubscribe();
  }

  private parseAbsParam(val: string | null): AbsConfiguration | null {
    if (!val) return null;
    const s = val.toLowerCase();
    if (s === 'none' || s === 'non-abs' || s === 'conventional') return 'none';
    if (s === 'single_channel_front' || s === 'single_channel' || s === 'single' || s === 'single-channel') return 'single_channel_front';
    if (s === 'dual_channel' || s === 'dual' || s === 'dual-channel') return 'dual_channel';
    return null;
  }

  private parseActuationParam(val: string | null): string | null {
    if (!val) return null;
    const s = val.toLowerCase();
    if (s === 'independent') return 'independent';
    if (s === 'cbs' || s === 'linked_cbs' || s === 'linked') return 'cbs';
    return null;
  }

  private getFamilySlug(fam: 'step_through' | 'standard' | 'supersport' | 'extended'): string {
    if (fam === 'standard') return 'roadster';
    if (fam === 'step_through') return 'scooter';
    if (fam === 'supersport') return 'supersport';
    if (fam === 'extended') return 'extended';
    return 'roadster';
  }

  private parseFamilySlug(slug: string | null): 'step_through' | 'standard' | 'supersport' | 'extended' | null {
    if (!slug) return null;
    const s = slug.toLowerCase();
    if (s === 'roadster' || s === 'standard' || s === 'naked') return 'standard';
    if (s === 'scooter' || s === 'step_through' || s === 'step-through' || s === 'commuter' || s === 'underbone') return 'step_through';
    if (s === 'supersport' || s === 'sport' || s === 'performance') return 'supersport';
    if (s === 'extended' || s === 'cruiser' || s === 'adventure') return 'extended';
    return null;
  }

  private syncQueryParams(): void {
    if (this.isEditMode()) {
      const id = this.editingVehicleId();
      if (id) {
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: {
            mode: 'edit',
            bikeId: id,
            abs: this.absConfiguration(),
            actuation: this.actuation()
          },
          replaceUrl: true
        });
      }
    } else {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          mode: 'new',
          type: this.getFamilySlug(this.family()),
          model: this.selectedPresetKey().replace(/_/g, '-'),
          abs: this.absConfiguration(),
          actuation: this.actuation()
        },
        replaceUrl: true
      });
    }
  }

  selectFamily(famKey: 'step_through' | 'standard' | 'supersport' | 'extended'): void {
    this.family.set(famKey);
    const presets = EMPIRICAL_PRESETS.filter(p => p.familyKey === famKey);
    if (presets.length > 0) {
      this.applyPreset(presets[0]);
    } else {
      this.syncQueryParams();
    }
  }

  applyPreset(preset: EmpiricalPresetDescriptor, updateUrl = true): void {
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

    if (updateUrl) {
      this.syncQueryParams();
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
    this.syncQueryParams();
  }

  selectActuation(actKey: string): void {
    if (this.isMechanicalLinkageLocked()) {
      return;
    }
    this.actuation.set(actKey);
    this.syncQueryParams();
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

    let targetId: string;
    if (this.isEditMode() && this.editingVehicleId()) {
      this.garageService.updateVehicle(this.editingVehicleId()!, payload);
      targetId = this.editingVehicleId()!;
    } else {
      const created = this.garageService.addVehicle(payload);
      targetId = created.id;
    }

    this.router.navigate(['/workbench', targetId, 'analytics']);
  }
}
