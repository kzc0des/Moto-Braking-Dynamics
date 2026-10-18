import { Component, ElementRef, computed, inject, input, viewChild } from '@angular/core';
import { positionFloatingPanel } from '../floating-position';

/** Brake hardware on the brake cards. */
export type BrakeKind = 'single_disc' | 'dual_disc' | 'drum' | 'rear_disc';
/** ABS choices on the ABS cards. */
export type AbsKind = 'abs_none' | 'abs_single' | 'abs_dual';
export type BrakePreviewKind = BrakeKind | AbsKind;

export interface BrakePreviewInfo {
  title: string;
  /** Short tag in the panel header, e.g. which wheel or which ABS layout. */
  badge: string;
  /** How the assembly works, in plain language. */
  description: string;
  /** Where riders typically meet this setup, using bikes from the presets. */
  commonOn: string;
  /** Labelled photo in public/brakes. */
  image: { src: string; width: number; height: number };
  /** Panel width in px; wide photos with small labels get a wider panel. Defaults to 440. */
  panelWidth?: number;
}

export const BRAKE_PREVIEWS: Record<BrakePreviewKind, BrakePreviewInfo> = {
  single_disc: {
    title: 'Single front hydraulic disc',
    badge: 'Front',
    description: 'One drilled steel rotor is bolted to the front wheel. Squeezing the right lever pushes brake fluid down the hose to the caliper, whose pistons clamp the pads onto the rotor. It gives strong, easy-to-control stopping and dries quickly in the rain.',
    commonOn: 'Most scooters, underbones and 125–400cc bikes, e.g. Honda Click 125, Yamaha NMAX 155, Kawasaki Z250.',
    image: { src: 'brakes/hydraulicbrake.webp', width: 960, height: 960 }
  },
  dual_disc: {
    title: 'Dual front hydraulic disc',
    badge: 'Front',
    description: 'A rotor and caliper sit on each side of the front wheel, both fed by the same lever. Twice the pad area and twice the metal to absorb heat, so it stops harder and resists fade during repeated hard braking.',
    commonOn: 'Supersport and large-displacement bikes, e.g. Kawasaki Ninja ZX-6R, Yamaha YZF-R6.',
    image: { src: 'brakes/dualdiscbrake.webp', width: 960, height: 640 }
  },
  drum: {
    title: 'Rear mechanical drum',
    badge: 'Rear',
    description: 'Two curved shoes sit inside a closed drum in the rear hub. The pedal or lever pulls a rod or cable that turns a cam, pushing the shoes outward against the drum wall. Simple, cheap and sealed from dirt, but it fades sooner when hot and has no fluid circuit for ABS to control.',
    commonOn: 'The rear wheel of budget scooters and underbones, e.g. Honda Click 125, Honda Wave 125.',
    image: { src: 'brakes/drumbrake.webp', width: 960, height: 960 }
  },
  rear_disc: {
    title: 'Rear hydraulic disc',
    badge: 'Rear',
    description: 'A smaller solid rotor sits on the rear wheel, with its caliper mounted on the swingarm. Because it is hydraulic, it gives a firmer, more precise feel and can be controlled by dual-channel ABS.',
    commonOn: 'Maxi-scooters, sport, adventure and cruiser bikes, e.g. Yamaha NMAX 155, BMW G 310 GS.',
    image: { src: 'brakes/rearhydraulicbrake.webp', width: 960, height: 960 }
  },
  abs_none: {
    title: 'Non-ABS (conventional brakes)',
    badge: 'No ABS',
    description: 'Lever and pedal pressure goes straight to the brakes with no electronics in between. Brake too hard, especially on a wet or dusty road, and a wheel locks and skids: a locked front wheel tucks and drops the bike, a locked rear slides sideways. Stopping safely depends entirely on the rider.',
    commonOn: 'Budget commuters and older models, e.g. Honda Click 125, Honda Wave 125.',
    image: { src: 'brakes/non-abs.webp', width: 1120, height: 611 },
    panelWidth: 560
  },
  abs_single: {
    title: 'Single-channel ABS (front only)',
    badge: 'Front ABS',
    description: 'A wheel-speed sensor and valve unit watch the front wheel only. When it starts to lock, ABS releases and re-applies the pressure many times a second, so the front keeps its grip and the bike can still be steered. The rear brake has no ABS and can still lock and skid.',
    commonOn: 'Modern 125–160cc scooters and small bikes, e.g. Yamaha Aerox 155 S, Honda PCX 160 ABS.',
    image: { src: 'brakes/single-abs.webp', width: 1120, height: 611 },
    panelWidth: 560
  },
  abs_dual: {
    title: 'Dual-channel ABS (front and rear)',
    badge: 'Front + Rear ABS',
    description: 'Separate sensors and valves control each wheel, keeping both just short of locking, so the bike stops straight and stays steerable even on a wet road. It needs a hydraulic disc at the rear: a drum brake has no fluid circuit for ABS to control.',
    commonOn: 'Mid-size and larger bikes, e.g. BMW G 310 GS, Kawasaki Ninja ZX-6R ABS, Yamaha NMAX 155 ABS.',
    image: { src: 'brakes/dual-abs.webp', width: 1120, height: 611 },
    panelWidth: 560
  }
};

/**
 * Wraps a brake or ABS option card and shows its labelled photo while the pointer is over the card
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
