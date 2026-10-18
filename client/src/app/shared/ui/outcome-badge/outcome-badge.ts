import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TerminalOutcome } from '../../../core/models/telemetry.types';

@Component({
  selector: 'app-outcome-badge',
  imports: [CommonModule],
  templateUrl: './outcome-badge.html',
  styleUrl: './outcome-badge.css'
})
export class OutcomeBadge {
  readonly outcome = input.required<TerminalOutcome>();

  badgeClass(): string {
    switch (this.outcome()) {
      case 'Safe Stop':
        return 'bg-[var(--ok-tint)] text-[var(--ok-ink)] border-[var(--ok)]/60';
      case 'Barrier Collision':
        return 'bg-[var(--danger-tint)] text-[var(--danger-ink)] border-2 border-[var(--danger)] font-bold';
      case 'Front-Wheel Washout':
        return 'bg-[var(--danger-tint)] text-[var(--danger-ink)] border-2 border-[var(--danger)] font-bold';
      case 'Rear-Wheel Lift-off':
        return 'bg-[var(--danger-tint)] text-[var(--danger-ink)] border-2 border-[var(--danger)] font-bold';
      default:
        return 'bg-[var(--well)] text-[var(--ink-2)] border-[var(--kerb)]';
    }
  }
}
