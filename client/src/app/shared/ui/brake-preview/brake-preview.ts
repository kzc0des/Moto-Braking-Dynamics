import { Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { positionFloatingPanel } from '../floating-position';

export type BrakePreviewKind = 'single_disc' | 'dual_disc' | 'drum' | 'rear_disc';

export interface BrakePreviewInfo {
  title: string;
  position: 'Front' | 'Rear';
  /** How the assembly works, in plain language. */
  description: string;
  /** Where riders typically meet this setup, using bikes from the presets. */
  commonOn: string;
  /** Labelled photo in public/brakes. */
  image: { src: string; width: number; height: number };
}

export const BRAKE_PREVIEWS: Record<BrakePreviewKind, BrakePreviewInfo> = {
  single_disc: {
    title: 'Single front hydraulic disc',
    position: 'Front',
    description: 'One drilled steel rotor is bolted to the front wheel. Squeezing the right lever pushes brake fluid down the hose to the caliper, whose pistons clamp the pads onto the rotor. It gives strong, easy-to-control stopping and dries quickly in the rain.',
    commonOn: 'Most scooters, underbones and 125–400cc bikes, e.g. Honda Click 125, Yamaha NMAX 155, Kawasaki Z250.',
    image: { src: 'brakes/hydraulicbrake.webp', width: 960, height: 960 }
  },
  dual_disc: {
    title: 'Dual front hydraulic disc',
    position: 'Front',
    description: 'A rotor and caliper sit on each side of the front wheel, both fed by the same lever. Twice the pad area and twice the metal to absorb heat, so it stops harder and resists fade during repeated hard braking.',
    commonOn: 'Supersport and large-displacement bikes, e.g. Kawasaki Ninja ZX-6R, Yamaha YZF-R6.',
    image: { src: 'brakes/dualdiscbrake.webp', width: 960, height: 640 }
  },
  drum: {
    title: 'Rear mechanical drum',
    position: 'Rear',
    description: 'Two curved shoes sit inside a closed drum in the rear hub. The pedal or lever pulls a rod or cable that turns a cam, pushing the shoes outward against the drum wall. Simple, cheap and sealed from dirt, but it fades sooner when hot and has no fluid circuit for ABS to control.',
    commonOn: 'The rear wheel of budget scooters and underbones, e.g. Honda Click 125, Honda Wave 125.',
    image: { src: 'brakes/drumbrake.webp', width: 960, height: 960 }
  },
  rear_disc: {
    title: 'Rear hydraulic disc',
    position: 'Rear',
    description: 'A smaller solid rotor sits on the rear wheel, with its caliper mounted on the swingarm. Because it is hydraulic, it gives a firmer, more precise feel and can be controlled by dual-channel ABS.',
    commonOn: 'Maxi-scooters, sport, adventure and cruiser bikes, e.g. Yamaha NMAX 155, BMW G 310 GS.',
    image: { src: 'brakes/rearhydraulicbrake.webp', width: 960, height: 960 }
  }
};

/**
 * Wraps a brake option card and shows its labelled photo while the pointer is over the card
 * (or the card has keyboard focus). The panel lives in the browser top layer, so it is
 * never clipped by scroll containers and never pushes surrounding content around.
 */
@Component({
  selector: 'app-brake-preview',
  templateUrl: './brake-preview.html',
  styleUrl: './brake-preview.css',
  host: {
    '(pointerenter)': 'show()',
    '(pointerleave)': 'hide()',
    '(focusin)': 'show()',
    '(focusout)': 'hide()'
  }
})
export class BrakePreview {
  readonly kind = input.required<BrakePreviewKind>();
  readonly info = computed(() => BRAKE_PREVIEWS[this.kind()]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');

  show(): void {
    const panel = this.panel().nativeElement;
    if (!panel.matches(':popover-open')) {
      panel.showPopover();
    }
    positionFloatingPanel(this.host.nativeElement, panel);
  }

  hide(): void {
    const panel = this.panel().nativeElement;
    if (panel.matches(':popover-open')) {
      panel.hidePopover();
    }
  }
}
