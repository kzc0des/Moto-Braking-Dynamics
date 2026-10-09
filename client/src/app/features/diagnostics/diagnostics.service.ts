import { Injectable, signal } from '@angular/core';

export interface DiagnosticsErrorEntry {
  timestamp: string;
  status: number;
  url: string;
  message: string;
  raw?: unknown;
}

export interface DiagnosticsSolverMetrics {
  roundtripLatencyMs: number;
  solverExecutionTimeMs: number;
  lastRunTimestamp: string;
  pointsGenerated: number;
  activeWarnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class DiagnosticsService {
  readonly isHudOpen = signal<boolean>(false);
  readonly errors = signal<DiagnosticsErrorEntry[]>([]);
  readonly metrics = signal<DiagnosticsSolverMetrics | null>(null);
  readonly rawRequestPayload = signal<unknown | null>(null);
  readonly rawResponsePayload = signal<unknown | null>(null);

  recordError(entry: DiagnosticsErrorEntry): void {
    this.errors.update(prev => [entry, ...prev.slice(0, 19)]);
  }

  recordMetrics(metrics: DiagnosticsSolverMetrics, requestPayload: unknown, responsePayload: unknown): void {
    this.metrics.set(metrics);
    this.rawRequestPayload.set(requestPayload);
    this.rawResponsePayload.set(responsePayload);
  }

  clearErrors(): void {
    this.errors.set([]);
  }

  toggleHud(): void {
    this.isHudOpen.update(v => !v);
  }
}
