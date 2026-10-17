import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-metric-card',
  imports: [CommonModule],
  templateUrl: './metric-card.html',
  styleUrl: './metric-card.css'
})
export class MetricCard {
  readonly title = input<string>('');
  readonly formula = input<string | null>(null);
  readonly showFormula = input<boolean>(false);
  readonly customClass = input<string>('');
}
