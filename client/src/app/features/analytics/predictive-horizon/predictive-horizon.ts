import { Component, inject, computed, signal, output, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { BenchmarkStore } from '../../../state/benchmark.store';
import { MetricCard } from '../../../shared/ui/metric-card/metric-card';
import { ForecastHero } from './components/forecast-hero/forecast-hero';
import { ComparativeMatrix } from './components/comparative-matrix/comparative-matrix';
import { GenericTestReportModal } from './components/generic-test-report-modal/generic-test-report-modal';

@Component({
  selector: 'app-predictive-horizon',
  imports: [
    CommonModule,
    MetricCard,
    ForecastHero,
    ComparativeMatrix,
    GenericTestReportModal
  ],
  templateUrl: './predictive-horizon.html',
  styleUrl: './predictive-horizon.css'
})
export class PredictiveHorizon implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly store = inject(BenchmarkStore);
  readonly simulateTrigger = output<void>();

  readonly isStatementOpen = signal<boolean>(false);
  readonly showDetails = signal<boolean>(false);
  readonly compareTab = signal<'brakes' | 'road'>('brakes');
  readonly isReportModalOpen = signal<boolean>(false);
  readonly reportGeneratedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  ngOnInit(): void {
    const whatif = this.route.snapshot.queryParamMap.get('whatif');
    if (whatif === 'brakes' || whatif === 'road') {
      this.compareTab.set(whatif);
    }
    const details = this.route.snapshot.queryParamMap.get('details');
    if (details === 'engineering') {
      this.showDetails.set(true);
    }
    const report = this.route.snapshot.queryParamMap.get('report');
    if (report === 'true') {
      this.isReportModalOpen.set(true);
    }
  }

  onCompareTabChange(tab: 'brakes' | 'road'): void {
    this.compareTab.set(tab);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { whatif: tab },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  toggleDetails(): void {
    const next = !this.showDetails();
    this.showDetails.set(next);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { details: next ? 'engineering' : null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  openReportModal(): void {
    this.isReportModalOpen.set(true);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { report: 'true' },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  closeReportModal(): void {
    this.isReportModalOpen.set(false);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { report: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  @HostListener('window:keydown.escape')
  onEscape(): void {
    if (this.isReportModalOpen()) {
      this.closeReportModal();
    }
  }

  // --- Physical Reference Constants ---
  private readonly G = 9.81;
  private readonly T_REACTION = 1.0; // Standard SAE perception-reaction delay (s)

  readonly selectedInst = computed(() => this.store.selectedInstance());

  // Input states
  readonly speedKmh = computed(() => {
    const vMs = this.selectedInst().simulation.initialVelocity;
    return Math.round(vMs * 3.6);
  });

  readonly hazardDistance = computed(() => this.selectedInst().simulation.hazardDistance);
  readonly massKg = computed(() => this.selectedInst().vehicle.mass);

  readonly substrate = computed(() => this.selectedInst().environment.substrate);
  readonly contaminant = computed(() => this.selectedInst().environment.contaminant);
  readonly gradeDeg = computed(() => Math.round(this.selectedInst().environment.roadGradeAngle * 180 / Math.PI));

  // Friction coefficient computation
  readonly frictionCoeff = computed(() => {
    const baseMu = this.substrate() === 'asphalt' ? 0.85 : this.substrate() === 'concrete' ? 0.80 : 0.54;
    const conFactor = this.contaminant() === 'dry' ? 1.0 : this.contaminant() === 'wet' ? 0.65 : 0.50;
    return Number((baseMu * conFactor).toFixed(2));
  });

  // Biomechanical Dual-Brake Actuation parameters
  readonly frontLeverPct = computed(() => this.selectedInst().actuation.frontLeverPct ?? 85);
  readonly rearControlPct = computed(() => this.selectedInst().actuation.rearControlPct ?? 65);
  readonly rearControlLabel = computed(() => {
    const key = this.selectedInst().spriteKey;
    return (key === 'scooter' || key === 'maxi') ? 'Left Hand Lever' : 'Right Foot Pedal';
  });
  readonly rearControlType = computed(() => {
    const key = this.selectedInst().spriteKey;
    return (key === 'scooter' || key === 'maxi') ? 'Fine-Motor (Hand)' : 'Gross-Motor (Foot)';
  });
  readonly peakFrontPressureMpa = computed(() => Number(((this.frontLeverPct() / 100) * 6.5).toFixed(1)));
  readonly peakRearPressureMpa = computed(() => Number(((this.rearControlPct() / 100) * 5.0).toFixed(1)));

  readonly modulationEfficiency = computed(() => {
    const frontWeight = 1 - this.selectedInst().vehicle.brakeBiasRatio;
    const rearWeight = this.selectedInst().vehicle.brakeBiasRatio;
    return Math.min(1.0, Math.max(0.2, ((this.frontLeverPct() / 100) * frontWeight + (this.rearControlPct() / 100) * rearWeight)));
  });

  readonly modulationEfficiencyPct = computed(() => Math.round(this.modulationEfficiency() * 100));

  // Brake efficiency per setup (shared by the headline and the comparison rows)
  private readonly BRAKE_ETA: Record<string, number> = {
    drum: 0.70,
    disc: 0.85,
    single_abs: 0.92,
    dual_abs: 0.97
  };

  readonly activeBrakeKey = computed<'drum' | 'disc' | 'single_abs' | 'dual_abs'>(() => {
    const abs = this.selectedInst().absConfiguration ?? 'none';
    if (abs === 'dual_channel') return 'dual_abs';
    if (abs === 'single_channel_front') return 'single_abs';
    return this.isRearDrum() ? 'drum' : 'disc';
  });

  readonly activeBrakeEta = computed(() => this.BRAKE_ETA[this.activeBrakeKey()]);

  // Effective deceleration
  readonly decelMs2 = computed(() => {
    const mu = this.frictionCoeff();
    const th = this.selectedInst().environment.roadGradeAngle;
    const eff = this.activeBrakeEta() * this.modulationEfficiency();
    const a = this.G * (mu * eff * Math.cos(th) + Math.sin(th));
    return Number(Math.max(0.5, a).toFixed(2));
  });

  readonly mfddG = computed(() => {
    return Number((this.decelMs2() / this.G).toFixed(2));
  });

  readonly peakG = computed(() => {
    return Number((this.mfddG() * 1.2).toFixed(2));
  });

  // Distances
  readonly reactionDistance = computed(() => {
    const v0 = this.selectedInst().simulation.initialVelocity;
    return Number((v0 * this.T_REACTION).toFixed(1));
  });

  readonly brakingDistance = computed(() => {
    const v0 = this.selectedInst().simulation.initialVelocity;
    const a = this.decelMs2();
    return Number(((v0 * v0) / (2 * a)).toFixed(1));
  });

  readonly stopDistance = computed(() => {
    return Number((this.reactionDistance() + this.brakingDistance()).toFixed(1));
  });

  readonly stopDistanceFormatted = computed(() => this.stopDistance().toFixed(1));

  readonly margin = computed(() => {
    return Number((this.hazardDistance() - this.stopDistance()).toFixed(1));
  });

  readonly marginFormatted = computed(() => {
    const m = this.margin();
    return (m > 0 ? `+${m.toFixed(1)}` : m.toFixed(1));
  });

  readonly stopTime = computed(() => {
    const v0 = this.selectedInst().simulation.initialVelocity;
    const a = this.decelMs2();
    return Number((this.T_REACTION + v0 / a).toFixed(2));
  });

  readonly stopTimeFormatted = computed(() => this.stopTime().toFixed(2));

  // Impact velocity if collision
  readonly impactSpeedKmh = computed(() => {
    const m = this.margin();
    if (m >= 0) return 0;
    const v0 = this.selectedInst().simulation.initialVelocity;
    const a = this.decelMs2();
    const dr = this.reactionDistance();
    const X = this.hazardDistance();
    if (dr >= X) return Math.round(v0 * 3.6);
    const v2 = Math.max(0, v0 * v0 - 2 * a * (X - dr));
    return Math.round(Math.sqrt(v2) * 3.6);
  });

  // Verdict state
  readonly verdict = computed(() => {
    const m = this.margin();
    if (m >= 0) {
      return {
        text: `PASSED: SAFE STOP (+${m.toFixed(1)}m MARGIN)`,
        badgeClass: 'bg-[var(--ok-tint)] border-2 border-[var(--ok)]/60 text-[var(--ok-ink)] font-bold shadow-xs'
      };
    }
    return {
      text: `FAILED: BARRIER COLLISION (${this.impactSpeedKmh()} KM/H IMPACT)`,
      badgeClass: 'bg-[var(--danger-tint)] border-2 border-[var(--danger)] text-[var(--danger-ink)] font-bold shadow-xs'
    };
  });

  // Distance Tape Geometry
  readonly tape = computed(() => {
    const X = this.hazardDistance();
    const S = this.stopDistance();
    const maxScale = Math.max(X, S) * 1.15;

    const barrierPct = Math.min(95, Math.max(5, (X / maxScale) * 100));
    const p1Pct = (this.reactionDistance() / maxScale) * 100;
    const p2Pct = (this.brakingDistance() / maxScale) * 100;

    const col = this.margin() < 0;
    const fillClass = col ? 'bg-[var(--danger-fill)]' : 'bg-[var(--ok)]';
    const note = col
      ? `COLLISION DEFICIT: ${Math.abs(this.margin()).toFixed(1)} m OVERRUN`
      : `SAFETY CLEARANCE: +${this.margin().toFixed(1)} m BUFFER`;

    return {
      barrierPct: Number(barrierPct.toFixed(1)),
      phase1Pct: Number(p1Pct.toFixed(1)),
      phase2Pct: Number(p2Pct.toFixed(1)),
      fillClass,
      note
    };
  });

  // Slip ratio
  readonly criticalSlip = computed(() => 0.18);
  readonly peakSlip = computed(() => {
    const con = this.contaminant();
    return con === 'dry' ? '0.16' : con === 'wet' ? '0.22' : '0.26';
  });

  readonly slipStatus = computed(() => {
    const slip = Number(this.peakSlip());
    if (slip > this.criticalSlip()) {
      return {
        text: 'SKID OVERRUN (ABS TRIGGER REQUIRED)',
        badgeClass: 'bg-[var(--line-tint)] border-[var(--warn)]/40 text-[var(--line-deep)]'
      };
    }
    return {
      text: 'OPTIMAL TRACTION ENVELOPE',
      badgeClass: 'bg-[var(--ok-tint)] border-[var(--ok)]/40 text-[var(--ok-ink)]'
    };
  });

  // Dynamic normal load transfer
  readonly frontLoadPct = computed(() => {
    const a = this.decelMs2();
    const bite = Math.min(96, Math.max(50, 48 + (0.6 / 1.3) * (a / this.G) * 100));
    return Math.round(bite);
  });

  readonly rearLoadPct = computed(() => 100 - this.frontLoadPct());
  readonly frontLoadKn = computed(() => Number(((this.massKg() * this.G * (this.frontLoadPct() / 100)) / 1000).toFixed(2)));
  readonly rearLoadKn = computed(() => Number(((this.massKg() * this.G * (this.rearLoadPct() / 100)) / 1000).toFixed(2)));

  // Rotor Thermal
  readonly peakTemp = computed(() => {
    const v0 = this.selectedInst().simulation.initialVelocity;
    const m = this.massKg();
    const rise = (0.85 * 0.5 * m * v0 * v0) / (1.5 * 460);
    return Math.round(25 + rise);
  });

  readonly thermalMarginText = computed(() => {
    const margin = 230 - this.peakTemp();
    if (margin > 0) return `+${margin}°C to Vapor Lock (T_boil = 230°C)`;
    return `VAPOR LOCK DANGER: ${Math.abs(margin)}°C OVERHEAT`;
  });

  // Kinetic Energy
  readonly kineticEnergyKj = computed(() => {
    const v0 = this.selectedInst().simulation.initialVelocity;
    const m = this.massKg();
    return Math.round((0.5 * m * v0 * v0) / 1000);
  });

  readonly horsepowerEquivalent = computed(() => Number((this.kineticEnergyKj() / 0.7457).toFixed(1)));
  readonly caloriesKcal = computed(() => Number((this.kineticEnergyKj() * 0.239).toFixed(1)));

  readonly thermalPowerKw = computed(() => {
    const tBrake = this.brakingDistance() / (this.selectedInst().simulation.initialVelocity / 2);
    if (tBrake <= 0) return 0;
    return Number((this.kineticEnergyKj() / tBrake).toFixed(1));
  });

  readonly energyDeficitKj = computed(() => {
    const vi = this.impactSpeedKmh() / 3.6;
    if (vi <= 0) return 0;
    const m = this.massKg();
    return Math.round((0.5 * m * vi * vi) / 1000);
  });

  // Caliper torque
  readonly frontBiasPct = computed(() => Math.round((1 - this.selectedInst().vehicle.brakeBiasRatio) * 100));
  readonly rearBiasPct = computed(() => 100 - this.frontBiasPct());
  readonly frontTorqueNm = computed(() => Math.round(480 * (this.frontBiasPct() / 100)));
  readonly rearTorqueNm = computed(() => Math.round(480 * (this.rearBiasPct() / 100)));

  // Comparative Matrix (Zone 3)
  readonly currentRoadTitle = computed(() => {
    const s = this.substrate();
    const c = this.contaminant();
    return `${c.toUpperCase()} ${s.toUpperCase()}`;
  });

  readonly isRearDrum = computed(() => {
    const rear = this.selectedInst().rearBrake?.brakeType ?? this.selectedInst().brake.brakeType;
    return rear === 'drum';
  });

  readonly isDualFront = computed(() => {
    const front = this.selectedInst().frontBrake;
    return (front?.pistonArea ?? 0.0014) > 0.0020;
  });

  readonly frontBrakeLabel = computed(() => {
    return this.isDualFront() ? 'Twin Front Discs' : 'Single Front Disc';
  });

  readonly rearBrakeLabel = computed(() => {
    return this.isRearDrum() ? 'Rear Mechanical Drum' : 'Rear Hydraulic Disc';
  });

  readonly activeBrakeSummary = computed(() => {
    const front = this.frontBrakeLabel();
    const rear = this.rearBrakeLabel();
    const abs = this.selectedInst().absConfiguration ?? 'none';
    const absText = abs === 'dual_channel' ? 'Dual-Ch. ABS' : (abs === 'single_channel_front' ? 'Single-Ch. ABS' : 'Non-ABS');
    return `${front} + ${rear} (${absText})`;
  });

  readonly techRows = computed(() => {
    const v0 = this.selectedInst().simulation.initialVelocity;
    const X = this.hazardDistance();
    const rxn = this.reactionDistance();
    const mu = this.frictionCoeff();
    const th = this.selectedInst().environment.roadGradeAngle;
    const maxScale = Math.max(X, this.stopDistance()) * 1.15;
    const frontLabel = this.frontBrakeLabel();

    const techs = [
      {
        key: 'drum',
        name: 'Rear Mechanical Drum',
        axleSpec: `${frontLabel} + Rear Drum (Cable/Rod)`,
        eta: this.BRAKE_ETA['drum']
      },
      {
        key: 'disc',
        name: 'Rear Hydraulic Disc',
        axleSpec: `${frontLabel} + Rear Disc (Non-ABS)`,
        eta: this.BRAKE_ETA['disc']
      },
      {
        key: 'single_abs',
        name: 'Single-Channel ABS',
        axleSpec: 'Front Wheel Modulated · Rear Unmodulated',
        eta: this.BRAKE_ETA['single_abs']
      },
      {
        key: 'dual_abs',
        name: 'Dual-Channel ABS',
        axleSpec: 'Front & Rear Axles Modulated (Dual Disc)',
        eta: this.BRAKE_ETA['dual_abs']
      }
    ];

    return techs.map(t => {
      const a = Math.max(0.5, this.G * (mu * t.eta * this.modulationEfficiency() * Math.cos(th) + Math.sin(th)));
      const dist = Number((rxn + (v0 * v0) / (2 * a)).toFixed(1));
      const m = Number((X - dist).toFixed(1));
      const col = m < 0;
      const wPct = Math.min(100, (dist / maxScale) * 100);

      const isActive = t.key === this.activeBrakeKey();

      return {
        key: t.key,
        name: t.name,
        axleSpec: t.axleSpec,
        dist,
        isActive,
        activeTag: isActive ? '[Active]' : '',
        widthPct: Number(wPct.toFixed(1)),
        barClass: col ? 'bg-[var(--danger-fill)]' : 'bg-[var(--ok)]',
        chipClass: col ? 'text-[var(--ink-2)]' : 'text-[var(--ok-ink)]',
        chip: col ? `Failed · Collision (${Math.abs(m)}m deficit)` : `Passed · Safe Stop (+${m}m margin)`
      };
    });
  });

  readonly surfRows = computed(() => {
    const v0 = this.selectedInst().simulation.initialVelocity;
    const X = this.hazardDistance();
    const rxn = this.reactionDistance();
    const eff = this.activeBrakeEta() * this.modulationEfficiency();
    const th = this.selectedInst().environment.roadGradeAngle;
    const maxScale = Math.max(X, this.stopDistance()) * 1.15;

    const surfs = [
      { name: 'Dry Asphalt', mu: 0.85 },
      { name: 'Wet Asphalt', mu: 0.55 },
      { name: 'Wet Loose Gravel', mu: 0.35 }
    ];

    return surfs.map(s => {
      const a = Math.max(0.5, this.G * (s.mu * eff * Math.cos(th) + Math.sin(th)));
      const dist = Number((rxn + (v0 * v0) / (2 * a)).toFixed(1));
      const m = Number((X - dist).toFixed(1));
      const col = m < 0;
      const wPct = Math.min(100, (dist / maxScale) * 100);

      return {
        name: s.name,
        mu: s.mu.toFixed(2),
        dist,
        activeTag: Math.abs(s.mu - this.frictionCoeff()) < 0.011 ? '[Active]' : '',
        widthPct: Number(wPct.toFixed(1)),
        barClass: col ? 'bg-[var(--danger-fill)]' : 'bg-[var(--ok)]',
        chipClass: col ? 'text-[var(--ink-2)]' : 'text-[var(--ok-ink)]',
        chip: col ? `Failed · Collision (${Math.abs(m)}m deficit)` : `Passed · Safe Stop (+${m}m margin)`
      };
    });
  });

  // Plain-language summary for non-expert readers
  readonly safeSpeedKmh = computed(() => {
    const a = this.decelMs2();
    const X = this.hazardDistance();
    const v = a * (-this.T_REACTION + Math.sqrt(this.T_REACTION * this.T_REACTION + (2 * X) / a));
    return Math.max(0, Math.floor(v * 3.6));
  });

  readonly plainSummary = computed(() => {
    const m = this.margin();
    if (m >= 0) {
      return `You stop ${m.toFixed(1)} m before the barrier at ${this.speedKmh()} km/h.`;
    }
    return `At ${this.speedKmh()} km/h you stop ${Math.abs(m).toFixed(1)} m too late and hit the barrier at ${this.impactSpeedKmh()} km/h. `
      + `Slowing to about ${this.safeSpeedKmh()} km/h would clear it.`;
  });

  readonly decelPlain = computed(() => {
    const g = this.mfddG();
    if (g >= 0.7) return 'Very strong braking';
    if (g >= 0.5) return 'Strong braking, typical of a street emergency stop';
    return 'Gentle braking: needs a long distance to stop';
  });

  readonly roadGradePenalty = computed(() => {
    const deg = this.gradeDeg();
    if (deg === 0) {
      return {
        text: 'Level Road (0° incline): Zero grade stopping distance penalty applied.',
        badgeClass: 'bg-[var(--surface)] border-[var(--kerb)] text-[#656C76]'
      };
    }
    if (deg < 0) {
      const addedM = Math.abs(deg) * 0.85;
      return {
        text: `Downhill Slope Penalty: ${deg}° grade adds +${addedM.toFixed(1)}m to required stopping distance.`,
        badgeClass: 'bg-[var(--danger-tint)] border-[var(--danger)]/40 text-[var(--danger-ink)]'
      };
    }
    const savedM = deg * 0.7;
    return {
      text: `Uphill Slope Benefit: +${deg}° grade reduces required stopping distance by -${savedM.toFixed(1)}m.`,
      badgeClass: 'bg-[var(--ok-tint)] border-[var(--ok)]/40 text-[var(--ok-ink)]'
    };
  });

  readonly forensicReportStatement = computed(() => {
    const m = this.margin();
    const temp = this.peakTemp();
    const slip = Number(this.peakSlip());
    const frontPsi = this.selectedInst().vehicle.frontTirePressurePsi ?? 29.0;
    const abs = this.selectedInst().absConfiguration ?? 'none';

    // Check tire pressure influence (ADR 0028)
    let tirePressureNote = '';
    if (frontPsi < 24.0) {
      tirePressureNote = ` Noticeable under-inflation (${frontPsi} PSI) caused carcass squirm and lateral softening, extending stopping distance by ~8%.`;
    } else if (frontPsi > 38.0) {
      tirePressureNote = ` Noticeable over-inflation (${frontPsi} PSI) caused contact patch crowning, reducing microscopic road keying and peak adhesion.`;
    }

    if (m >= 0) {
      const absNote = abs === 'dual_channel' ? ' Dual-channel ABS maintained optimal slip envelope throughout.' : abs === 'single_channel_front' ? ' Front-channel ABS prevented low-side washout.' : '';
      return `Safe stopping achieved with +${m.toFixed(1)}m clearance. Rotor temperature (${temp}°C) remains within thermal limits.${tirePressureNote}${absNote}`;
    }
    if (slip > this.criticalSlip()) {
      const absRemedy = abs === 'none' ? ' Upgrading to Single- or Dual-Channel ABS would actively pulse clamping pressure to prevent this skid.' : '';
      return `Barrier impact at ${this.impactSpeedKmh()} km/h. Stopping failure is physically attributed to tire longitudinal slip exceeding critical threshold (κ = ${slip} > 0.18) on contaminated surface.${absRemedy}${tirePressureNote}`;
    }
    return `Barrier impact at ${this.impactSpeedKmh()} km/h caused by insufficient total stopping margin relative to initial kinetic energy (${this.kineticEnergyKj()} kJ).${tirePressureNote}`;
  });

  // Report Specific Properties
  readonly frontPsi = computed(() => this.selectedInst().vehicle.frontTirePressurePsi ?? 29.0);
  readonly rearPsi = computed(() => this.selectedInst().vehicle.rearTirePressurePsi ?? 33.0);

  readonly absStatusText = computed(() => {
    const abs = this.selectedInst().absConfiguration ?? 'none';
    if (abs === 'dual_channel') return 'Dual-Channel Electro-Hydraulic ABS';
    if (abs === 'single_channel_front') return 'Single-Channel Front Wheel ABS';
    return 'Conventional Unmodulated (Non-ABS)';
  });

  readonly frontBrakeText = computed(() => {
    const isDual = this.selectedInst().spriteKey === 'supersport';
    return isDual ? 'Twin Radial Hydraulic Discs' : 'Single Hydraulic Disc';
  });

  readonly rearBrakeText = computed(() => {
    const isDrum = this.selectedInst().rearBrake?.brakeType === 'drum' || this.selectedInst().brake.brakeType === 'drum';
    return isDrum ? 'Mechanical Cable Drum (Immune to Fluid Boil)' : 'Single Hydraulic Disc';
  });

  readonly roadConditionSummary = computed(() => {
    const sub = this.substrate().toUpperCase();
    const con = this.contaminant().toUpperCase();
    const mu = this.frictionCoeff();
    return `${sub} (${con}) · Nominal Friction μ = ${mu}`;
  });

  printReport(): void {
    window.print();
  }
}
