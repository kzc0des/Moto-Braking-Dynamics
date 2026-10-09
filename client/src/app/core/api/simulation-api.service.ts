import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BenchmarkInstanceConfig, ArchetypePreset } from '../models/benchmark.types';
import { BenchmarkResponse } from '../models/telemetry.types';

export interface BenchmarkApiPayload {
  instances: BenchmarkInstanceConfig[];
}

@Injectable({
  providedIn: 'root'
})
export class SimulationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/simulation';

  runBenchmark(payload: BenchmarkApiPayload): Observable<BenchmarkResponse> {
    return this.http.post<BenchmarkResponse>(`${this.baseUrl}/benchmark`, payload);
  }

  getPresets(): Observable<ArchetypePreset[]> {
    return this.http.get<ArchetypePreset[]>(`${this.baseUrl}/presets`);
  }
}
