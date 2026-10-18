import { Component, computed, input } from '@angular/core';
import { VehicleSpriteKey } from '../../../core/models/benchmark.types';

type SilhouetteKind = Exclude<VehicleSpriteKey, 'ninja'>;

interface VehiclePhoto {
  src: string;
  label: string;
}

/**
 * Real side-profile photos (transparent cut-outs in public/vehicles, facing right).
 * Every archetype must have one, so a missing photo is a compile error rather than a blank card.
 */
const PHOTOS: Record<SilhouetteKind, VehiclePhoto> = {
  scooter: { src: 'vehicles/hc125.png', label: 'Honda Click 125' },
  maxi: { src: 'vehicles/nmax155.png', label: 'Yamaha NMAX 155' },
  underbone: { src: 'vehicles/hw125.png', label: 'Honda Wave 125' },
  naked: { src: 'vehicles/kz250.png', label: 'Kawasaki Z250' },
  supersport: { src: 'vehicles/zx6r.png', label: 'Kawasaki Ninja ZX-6R' },
  adventure: { src: 'vehicles/g310.png', label: 'BMW G 310 GS' },
  cruiser: { src: 'vehicles/kvs300.png', label: 'Kawasaki Vulcan S' }
};

/** Side-profile photo of a vehicle archetype, standing on a shared ground line so all models line up. */
@Component({
  selector: 'app-vehicle-silhouette',
  templateUrl: './vehicle-silhouette.html',
  styleUrl: './vehicle-silhouette.css'
})
export class VehicleSilhouette {
  readonly kind = input.required<VehicleSpriteKey>();

  readonly photo = computed(() => {
    const kind = this.kind();
    return PHOTOS[kind === 'ninja' ? 'supersport' : kind];
  });

  readonly ariaLabel = computed(() => `${this.photo().label} side profile`);
}
