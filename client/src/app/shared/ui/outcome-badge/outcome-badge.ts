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
        return 'bg-[#EAF7EE] text-[#156939] border-[#1F9D55]/60';
      case 'Barrier Collision':
        return 'bg-[#FDF0EF] text-[#9E241E] border-2 border-[#D93A32] font-bold';
      case 'Front-Wheel Washout':
        return 'bg-[#FDF0EF] text-[#9E241E] border-2 border-[#D93A32] font-bold';
      case 'Rear-Wheel Lift-off':
        return 'bg-[#FDF0EF] text-[#9E241E] border-2 border-[#D93A32] font-bold';
      default:
        return 'bg-[var(--well)] text-[var(--ink-2)] border-[var(--kerb)]';
    }
  }
}
