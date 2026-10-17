import { Component, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface TechRow {
  key: string;
  name: string;
  axleSpec: string;
  dist: number;
  isActive: boolean;
  activeTag: string;
  widthPct: number;
  barClass: string;
  chipClass: string;
  chip: string;
}

export interface SurfRow {
  name: string;
  mu: string;
  dist: number;
  activeTag: string;
  widthPct: number;
  barClass: string;
  chipClass: string;
  chip: string;
}

@Component({
  selector: 'app-comparative-matrix',
  imports: [CommonModule],
  templateUrl: './comparative-matrix.html',
  styleUrl: './comparative-matrix.css'
})
export class ComparativeMatrix {
  readonly currentRoadTitle = input.required<string>();
  readonly activeBrakeSummary = input.required<string>();
  readonly techRows = input.required<TechRow[]>();
  readonly surfRows = input.required<SurfRow[]>();
  readonly barrierPct = input.required<number>();

  readonly compareTab = signal<'brakes' | 'road'>('brakes');
}
