import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface VerdictState {
  text: string;
  badgeClass: string;
}

export interface TapeGeometry {
  barrierPct: number;
  phase1Pct: number;
  phase2Pct: number;
  fillClass: string;
  note: string;
}

@Component({
  selector: 'app-forecast-hero',
  imports: [CommonModule],
  templateUrl: './forecast-hero.html',
  styleUrl: './forecast-hero.css'
})
export class ForecastHero {
  readonly verdict = input.required<VerdictState>();
  readonly stopDistanceFormatted = input.required<string>();
  readonly margin = input.required<number>();
  readonly marginFormatted = input.required<string>();
  readonly stopTimeFormatted = input.required<string>();
  readonly hazardDistance = input.required<number>();
  readonly tape = input.required<TapeGeometry>();
  readonly reactionDistance = input.required<number>();
  readonly brakingDistance = input.required<number>();
  readonly plainSummary = input.required<string>();
  readonly rearLoadPct = input.required<number>();
}
