import { Component, input } from '@angular/core';
import { BrakeKind } from '../brake-preview/brake-preview';

/**
 * Small always-visible glyph for a brake card: drilled rotor + caliper for discs, a closed
 * housing with shoes for the drum. Drawn in currentColor so it follows the card's state colour.
 */
@Component({
  selector: 'app-brake-icon',
  templateUrl: './brake-icon.html',
  styleUrl: './brake-icon.css'
})
export class BrakeIcon {
  readonly kind = input.required<BrakeKind>();
}
