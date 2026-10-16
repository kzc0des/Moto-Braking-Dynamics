import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';
import { VehicleSpriteKey } from '../models/benchmark.types';

export interface VehicleKinematicsConfig {
  initialVelocity: number;     // m/s (v_0)
  hazardDistance: number;      // m (X_hazard)
  frontLeverPct?: number;      // %
  rearControlPct?: number;     // %
}

export interface CustomVehicleRecord {
  id: string;
  category: string;
  title: string;
  spriteKey?: VehicleSpriteKey;
  displacementCc: number;
  massKg: number;
  frontBrake: string;
  rearBrake: string;
  actuation: string;
  wheelbase: number;
  cogHeight: number;
  rotorDiameterMm: number;
  padFriction: number;
  fluidBoilTemp: number;
  createdAt: number;
  kinematics?: VehicleKinematicsConfig;
}

export function getMaxSpeedForCc(cc: number): number {
  if (cc <= 110) return 80;
  if (cc <= 160) return 105;
  if (cc <= 250) return 135;
  if (cc <= 400) return 165;
  if (cc <= 650) return 205;
  return 260;
}

const STORAGE_KEY = 'moto_garage_collection_v1';

export const BASELINE_SCOOTER_RECORD: CustomVehicleRecord = {
  id: 'baseline-scooter-125',
  category: 'step_through',
  title: '125cc Commuter Scooter',
  spriteKey: 'scooter',
  displacementCc: 125,
  massKg: 130,
  frontBrake: 'single_disc',
  rearBrake: 'drum',
  actuation: 'cbs',
  wheelbase: 1.28,
  cogHeight: 0.48,
  rotorDiameterMm: 220,
  padFriction: 0.35,
  fluidBoilTemp: 210,
  createdAt: Date.now(),
  kinematics: {
    initialVelocity: 16.67,
    hazardDistance: 35.0,
    frontLeverPct: 85,
    rearControlPct: 65
  }
};

@Injectable({
  providedIn: 'root'
})
export class GarageService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly benchmarkStore = inject(BenchmarkStore);

  readonly vehicles = signal<CustomVehicleRecord[]>([]);
  readonly activeVehicleId = signal<string>('');

  readonly activeVehicle = computed(() => {
    const list = this.vehicles();
    const id = this.activeVehicleId();
    return list.find(v => v.id === id) ?? list[0] ?? null;
  });

  readonly hasVehicles = computed(() => this.vehicles().length > 0);

  readonly activeMaxSpeedKmh = computed(() => {
    const v = this.activeVehicle();
    return v ? getMaxSpeedForCc(v.displacementCc) : 105;
  });

  constructor() {
    this.initFromStorage();
  }

  private initFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.vehicles) && parsed.vehicles.length > 0) {
          // Deduplicate any baseline duplicates from previous runs
          const seen = new Set<string>();
          let seenBaseline = false;
          const cleaned: CustomVehicleRecord[] = [];

          for (const v of parsed.vehicles) {
            const isBaseline = v.id === BASELINE_SCOOTER_RECORD.id || v.id.startsWith('baseline-');
            const defaultKin = {
              initialVelocity: 16.67,
              hazardDistance: 35.0,
              frontLeverPct: 85,
              rearControlPct: 65
            };

            if (isBaseline) {
              if (seenBaseline) continue;
              seenBaseline = true;
              cleaned.push({
                ...v,
                id: BASELINE_SCOOTER_RECORD.id,
                kinematics: v.kinematics ?? defaultKin
              });
              seen.add(BASELINE_SCOOTER_RECORD.id);
              continue;
            }

            if (!seen.has(v.id)) {
              seen.add(v.id);
              cleaned.push({
                ...v,
                kinematics: v.kinematics ?? defaultKin
              });
            }
          }

          this.vehicles.set(cleaned);
          const activeId = cleaned.some(v => v.id === parsed.activeVehicleId)
            ? parsed.activeVehicleId
            : cleaned[0].id;
          this.activeVehicleId.set(activeId);
          this.persist();
          this.syncToBenchmarkStore(this.activeVehicle());
          return;
        }
      }
    } catch (e) {
      console.warn('[GarageService] Failed to load garage from localStorage:', e);
    }
  }

  private persist(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const payload = {
        activeVehicleId: this.activeVehicleId(),
        vehicles: this.vehicles()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('[GarageService] Failed to persist garage:', e);
    }
  }

  loadBaselineScooter(): CustomVehicleRecord {
    const existing = this.vehicles().find(
      v => v.id === BASELINE_SCOOTER_RECORD.id || v.id.startsWith('baseline-')
    );

    if (existing) {
      this.setActiveVehicle(existing.id);
      return existing;
    }

    const record = { ...BASELINE_SCOOTER_RECORD };
    this.vehicles.update(list => [record, ...list]);
    this.activeVehicleId.set(record.id);
    this.persist();
    this.syncToBenchmarkStore(record);
    return record;
  }

  addVehicle(data: Omit<CustomVehicleRecord, 'id' | 'createdAt'>): CustomVehicleRecord {
    const newRecord: CustomVehicleRecord = {
      ...data,
      id: 'bike-' + Date.now(),
      createdAt: Date.now(),
      kinematics: data.kinematics ?? {
        initialVelocity: 16.67,
        hazardDistance: 35.0,
        frontLeverPct: 85,
        rearControlPct: 65
      }
    };

    this.vehicles.update(list => [newRecord, ...list]);
    this.activeVehicleId.set(newRecord.id);
    this.persist();
    this.syncToBenchmarkStore(newRecord);
    return newRecord;
  }

  updateVehicle(id: string, data: Partial<Omit<CustomVehicleRecord, 'id' | 'createdAt'>>): void {
    this.vehicles.update(list =>
      list.map(v => (v.id === id ? { ...v, ...data, kinematics: data.kinematics ?? v.kinematics } : v))
    );
    this.persist();

    if (this.activeVehicleId() === id) {
      this.syncToBenchmarkStore(this.activeVehicle());
    }
  }

  updateKinematics(id: string, kin: Partial<VehicleKinematicsConfig>): void {
    this.vehicles.update(list =>
      list.map(v => {
        if (v.id !== id) return v;
        const currentKin = v.kinematics ?? {
          initialVelocity: 16.67,
          hazardDistance: 35.0,
          frontLeverPct: 85,
          rearControlPct: 65
        };
        return {
          ...v,
          kinematics: { ...currentKin, ...kin }
        };
      })
    );
    this.persist();
  }

  deleteVehicle(id: string): void {
    const currentList = this.vehicles();
    if (currentList.length <= 1) {
      console.warn('[GarageService] Cannot delete the only vehicle in the garage.');
      return;
    }

    const updated = currentList.filter(v => v.id !== id);
    this.vehicles.set(updated);

    if (this.activeVehicleId() === id) {
      this.activeVehicleId.set(updated[0].id);
      this.syncToBenchmarkStore(updated[0]);
    }
    this.persist();
  }

  setActiveVehicle(id: string): void {
    const found = this.vehicles().find(v => v.id === id);
    if (!found) return;

    this.activeVehicleId.set(id);
    this.persist();
    this.syncToBenchmarkStore(found);
  }

  getVehicleById(id: string): CustomVehicleRecord | undefined {
    return this.vehicles().find(v => v.id === id);
  }

  private syncToBenchmarkStore(record: CustomVehicleRecord | null): void {
    if (!record) return;

    const maxSpeed = getMaxSpeedForCc(record.displacementCc);
    const savedSpeedKmh = record.kinematics?.initialVelocity
      ? Math.round(record.kinematics.initialVelocity * 3.6)
      : 60;
    const clampedSpeedKmh = Math.min(Math.max(savedSpeedKmh, 20), maxSpeed);
    const targetVelocity = Number((clampedSpeedKmh / 3.6).toFixed(2));
    const targetHazard = record.kinematics?.hazardDistance ?? 35.0;
    const targetFrontLever = record.kinematics?.frontLeverPct ?? 85;
    const targetRearControl = record.kinematics?.rearControlPct ?? 65;

    this.benchmarkStore.configureCustomVehicle({
      category: record.category,
      title: record.title,
      spriteKey: record.spriteKey,
      displacementCc: record.displacementCc,
      massKg: record.massKg,
      frontBrake: record.frontBrake,
      rearBrake: record.rearBrake,
      actuation: record.actuation,
      wheelbase: record.wheelbase,
      cogHeight: record.cogHeight,
      rotorDiameterMm: record.rotorDiameterMm,
      padFriction: record.padFriction,
      fluidBoilTemp: record.fluidBoilTemp,
      initialVelocity: targetVelocity,
      hazardDistance: targetHazard,
      frontLeverPct: targetFrontLever,
      rearControlPct: targetRearControl
    });
  }
}
