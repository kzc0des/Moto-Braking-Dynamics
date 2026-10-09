import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerminalOutcome } from '../../core/models/telemetry.types';

@Component({
  selector: 'app-outcome-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span
      class="inline-flex items-center px-2.5 py-0.5 text-xs font-mono font-bold tracking-wider uppercase border rounded-xs select-none transition-colors"
      [ngClass]="badgeClass()"
    >
      [{{ outcome() }}]
    </span>
  `,
  styles: [`
    :host {
      display: inline-block;
    }
  `]
})
export class OutcomeBadgeComponent {
  readonly outcome = input.required<TerminalOutcome>();

  badgeClass(): string {
    switch (this.outcome()) {
      case 'Safe Stop':
        return 'bg-emerald-950/40 text-emerald-400 border-emerald-500/50';
      case 'Barrier Collision':
        return 'bg-rose-950/50 text-rose-400 border-rose-500/60 animate-pulse';
      case 'Front-Wheel Washout':
        return 'bg-amber-950/40 text-amber-400 border-amber-500/50';
      case 'Rear-Wheel Lift-off':
        return 'bg-cyan-950/40 text-cyan-400 border-cyan-500/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  }
}
