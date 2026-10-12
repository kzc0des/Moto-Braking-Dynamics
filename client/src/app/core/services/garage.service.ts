import { Injectable, inject, signal, computed, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BenchmarkStore } from '../../state/benchmark.store';

export interface CustomVehicleRecord {
  id: string;
  category: string;
  title: string;
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
  category: 'scooter',
  title: '125cc Commuter Scooter',
  displacementCc: 125,
  massKg: 165,
  frontBrake: 'single_disc',
  rearBrake: 'drum',
  actuation: 'independent',
  wheelbase: 1.28,
  cogHeight: 0.62,
  rotorDiameterMm: 220,
  padFriction: 0.35,
  fluidBoilTemp: 230,
  createdAt: Date.now()
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
          this.vehicles.set(parsed.vehicles);
          const activeId = parsed.activeVehicleId || parsed.vehicles[0].id;
          this.activeVehicleId.set(activeId);
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
    const record = { ...BASELINE_SCOOTER_RECORD, id: 'baseline-' + Date.now() };
    this.vehicles.update(list => [record, ...list.filter(v => v.id !== record.id)]);
    this.activeVehicleId.set(record.id);
    this.persist();
    this.syncToBenchmarkStore(record);
    return record;
  }

  addVehicle(data: Omit<CustomVehicleRecord, 'id' | 'createdAt'>): CustomVehicleRecord {
    const newRecord: CustomVehicleRecord = {
      ...data,
      id: 'bike-' + Date.now(),
      createdAt: Date.now()
    };

    this.vehicles.update(list => [newRecord, ...list]);
    this.activeVehicleId.set(newRecord.id);
    this.persist();
    this.syncToBenchmarkStore(newRecord);
    return newRecord;
  }

  updateVehicle(id: string, data: Partial<Omit<CustomVehicleRecord, 'id' | 'createdAt'>>): void {
    this.vehicles.update(list =>
      list.map(v => (v.id === id ? { ...v, ...data } : v))
    );
    this.persist();

    if (this.activeVehicleId() === id) {
      this.syncToBenchmarkStore(this.activeVehicle());
    }
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

    this.benchmarkStore.configureCustomVehicle({
      category: record.category,
      title: record.title,
      displacementCc: record.displacementCc,
      massKg: record.massKg,
      frontBrake: record.frontBrake,
      rearBrake: record.rearBrake,
      actuation: record.actuation,
      wheelbase: record.wheelbase,
      cogHeight: record.cogHeight,
      rotorDiameterMm: record.rotorDiameterMm,
      padFriction: record.padFriction,
      fluidBoilTemp: record.fluidBoilTemp
    });

    // Check if current speed exceeds displacement cap
    const maxSpeed = getMaxSpeedForCc(record.displacementCc);
    const currentSpeedKmh = Math.round(this.benchmarkStore.selectedInstance().simulation.initialVelocity * 3.6);
    if (currentSpeedKmh > maxSpeed) {
      this.benchmarkStore.updateSelectedInstance('simulation', {
        ...this.benchmarkStore.selectedInstance().simulation,
        initialVelocity: Number((maxSpeed / 3.6).toFixed(2))
      });
    }
  }
}
