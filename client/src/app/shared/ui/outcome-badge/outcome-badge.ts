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
        return 'bg-[#EAF7EE] text-[#1E7E4E] border-[#2F9E6B]';
      case 'Barrier Collision':
        return 'bg-[#FDEBE8] text-[#C93A30] border-[#F2554A]';
      case 'Front-Wheel Washout':
        return 'bg-[#FEF7EC] text-[#B87A14] border-[#E0A030]';
      case 'Rear-Wheel Lift-off':
        return 'bg-[#FEF7EC] text-[#B87A14] border-[#E0A030]';
      default:
        return 'bg-[#F3EEE6] text-[#6B645C] border-[#E6DFD3]';
    }
  }
}
