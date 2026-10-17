import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-generic-test-report-modal',
  imports: [CommonModule],
  templateUrl: './generic-test-report-modal.html',
  styleUrl: './generic-test-report-modal.css'
})
export class GenericTestReportModal {
  readonly isOpen = input.required<boolean>();
  readonly reportGeneratedDate = input.required<string>();
  readonly selectedInst = input.required<any>();
  readonly margin = input.required<number>();
  readonly marginFormatted = input.required<string>();
  readonly massKg = input.required<number>();
  readonly frontBrakeText = input.required<string>();
  readonly rearBrakeText = input.required<string>();
  readonly absStatusText = input.required<string>();
  readonly substrate = input.required<string>();
  readonly contaminant = input.required<string>();
  readonly frictionCoeff = input.required<number>();
  readonly gradeDeg = input.required<number>();
  readonly hazardDistance = input.required<number>();
  readonly speedKmh = input.required<number>();
  readonly frontPsi = input.required<number>();
  readonly rearPsi = input.required<number>();
  readonly modulationEfficiencyPct = input.required<number>();
  readonly stopDistanceFormatted = input.required<string>();
  readonly reactionDistance = input.required<number>();
  readonly brakingDistance = input.required<number>();
  readonly stopTimeFormatted = input.required<string>();
  readonly mfddG = input.required<number>();
  readonly decelMs2 = input.required<number>();
  readonly kineticEnergyKj = input.required<number>();
  readonly frontLoadPct = input.required<number>();
  readonly frontLoadKn = input.required<number>();
  readonly plainSummary = input.required<string>();
  readonly forensicReportStatement = input.required<string>();

  readonly close = output<void>();

  printReport(): void {
    window.print();
  }
}
