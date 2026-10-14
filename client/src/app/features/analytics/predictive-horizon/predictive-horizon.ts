import { Component, inject, computed, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BenchmarkStore } from '../../../state/benchmark.store';

@Component({
  selector: 'app-predictive-horizon',
  imports: [CommonModule],
  templateUrl: './predictive-horizon.html',
  styleUrl: './predictive-horizon.css'
})
export class PredictiveHorizon {
  readonly store = inject(BenchmarkStore);
  readonly simulateTrigger = output<void>();

  readonly isStatementOpen = signal<boolean>(false);

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

  // Effective deceleration
  readonly decelMs2 = computed(() => {
    const mu = this.frictionCoeff();
    const th = this.selectedInst().environment.roadGradeAngle;
    const eff = 0.85 * this.modulationEfficiency();
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
        badgeClass: 'bg-[#EAF7EE] border-2 border-[#1F9D55]/60 text-[#156939] font-bold shadow-xs'
      };
    }
    return {
      text: `FAILED: BARRIER COLLISION (${this.impactSpeedKmh()} KM/H IMPACT)`,
      badgeClass: 'bg-[#FDF0EF] border-2 border-[#D93A32] text-[#9E241E] font-bold shadow-xs'
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
    const fillClass = col ? 'bg-[#D93A32]' : 'bg-[#1F9D55]';
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
        badgeClass: 'bg-[#FFF6D1] border-[#E8750F]/40 text-[#7A5800]'
      };
    }
    return {
      text: 'OPTIMAL TRACTION ENVELOPE',
      badgeClass: 'bg-[#EAF7EE] border-[#1F9D55]/40 text-[#156939]'
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
  readonly frontBiasPct = computed(() => Math.round(this.selectedInst().vehicle.brakeBiasRatio * 100));
  readonly rearBiasPct = computed(() => 100 - this.frontBiasPct());
  readonly frontTorqueNm = computed(() => Math.round(480 * (this.frontBiasPct() / 100)));
  readonly rearTorqueNm = computed(() => Math.round(480 * (this.rearBiasPct() / 100)));

  // Comparative Matrix (Zone 3)
  readonly currentRoadTitle = computed(() => {
    const s = this.substrate();
    const c = this.contaminant();
    return `${c.toUpperCase()} ${s.toUpperCase()}`;
  });

  readonly techRows = computed(() => {
    const v0 = this.selectedInst().simulation.initialVelocity;
    const X = this.hazardDistance();
    const rxn = this.reactionDistance();
    const mu = this.frictionCoeff();
    const th = this.selectedInst().environment.roadGradeAngle;
    const maxScale = Math.max(X, this.stopDistance()) * 1.15;

    const techs = [
      { name: 'Mechanical Drum', eta: 0.70 },
      { name: 'Conventional Disc', eta: 0.85 },
      { name: 'CBS (Combi-Brake)', eta: 0.92 },
      { name: 'ABS (Anti-lock)', eta: 0.97 }
    ];

    return techs.map(t => {
      const a = Math.max(0.5, this.G * (mu * t.eta * Math.cos(th) + Math.sin(th)));
      const dist = Number((rxn + (v0 * v0) / (2 * a)).toFixed(1));
      const m = Number((X - dist).toFixed(1));
      const col = m < 0;
      const wPct = Math.min(100, (dist / maxScale) * 100);

      return {
        name: t.name,
        dist,
        activeTag: t.name === 'Conventional Disc' ? '[Active]' : '',
        widthPct: Number(wPct.toFixed(1)),
        barClass: col ? 'bg-[#D93A32]' : 'bg-[#1F9D55]',
        chipClass: col ? 'text-[#9E241E]' : 'text-[#156939]',
        chip: col ? `Failed · Collision (${Math.abs(m)}m deficit)` : `Passed · Safe Stop (+${m}m margin)`
      };
    });
  });

  readonly surfRows = computed(() => {
    const v0 = this.selectedInst().simulation.initialVelocity;
    const X = this.hazardDistance();
    const rxn = this.reactionDistance();
    const eff = 0.85;
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
        activeTag: (this.substrate() === 'asphalt' && this.contaminant() === 'wet' && s.name === 'Wet Asphalt') ? '[Active]' : '',
        widthPct: Number(wPct.toFixed(1)),
        barClass: col ? 'bg-[#D93A32]' : 'bg-[#1F9D55]',
        chipClass: col ? 'text-[#9E241E]' : 'text-[#156939]',
        chip: col ? `Failed · Collision (${Math.abs(m)}m deficit)` : `Passed · Safe Stop (+${m}m margin)`
      };
    });
  });

  readonly roadGradePenalty = computed(() => {
    const deg = this.gradeDeg();
    if (deg === 0) {
      return {
        text: 'Level Road (0° incline): Zero grade stopping distance penalty applied.',
        badgeClass: 'bg-white border-[#DDE0E4] text-[#656C76]'
      };
    }
    if (deg < 0) {
      const addedM = Math.abs(deg) * 0.85;
      return {
        text: `Downhill Slope Penalty: ${deg}° grade adds +${addedM.toFixed(1)}m to required stopping distance.`,
        badgeClass: 'bg-[#FDF0EF] border-[#D93A32]/40 text-[#9E241E]'
      };
    }
    const savedM = deg * 0.7;
    return {
      text: `Uphill Slope Benefit: +${deg}° grade reduces required stopping distance by -${savedM.toFixed(1)}m.`,
      badgeClass: 'bg-[#EAF7EE] border-[#1F9D55]/40 text-[#156939]'
    };
  });

  readonly forensicReportStatement = computed(() => {
    const m = this.margin();
    const temp = this.peakTemp();
    const slip = Number(this.peakSlip());

    if (m >= 0) {
      return `Safe stopping achieved with +${m.toFixed(1)}m clearance. Rotor temperature (${temp}°C) remains well below fluid boil limit (230°C), maintaining full hydraulic clamping integrity.`;
    }
    if (slip > this.criticalSlip()) {
      return `Barrier impact at ${this.impactSpeedKmh()} km/h. Rotor temperature (${temp}°C) remains safe; stopping failure is physically attributed to tire longitudinal slip exceeding critical threshold (κ = ${slip} > 0.18) on contaminated surface.`;
    }
    return `Barrier impact at ${this.impactSpeedKmh()} km/h caused by insufficient total stopping margin relative to initial kinetic energy (${this.kineticEnergyKj()} kJ).`;
  });
}
