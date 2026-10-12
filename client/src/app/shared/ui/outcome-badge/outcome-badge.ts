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
        return 'bg-[#EAF7EE] text-[#156939] border-[#1F9D55]/40';
      case 'Barrier Collision':
        return 'bg-[#FDF0EF] text-[#9E241E] border-[#D93A32]/40';
      case 'Front-Wheel Washout':
        return 'bg-[#FFF6D1] text-[#7A5800] border-[#E8750F]/40';
      case 'Rear-Wheel Lift-off':
        return 'bg-[#FFF6D1] text-[#7A5800] border-[#E8750F]/40';
      default:
        return 'bg-[var(--well)] text-[var(--ink-2)] border-[var(--kerb)]';
    }
  }
}
