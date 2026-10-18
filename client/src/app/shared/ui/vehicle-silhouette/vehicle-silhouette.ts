import { Component, booleanAttribute, computed, input } from '@angular/core';
import { VehicleSpriteKey } from '../../../core/models/benchmark.types';

type SilhouetteKind = Exclude<VehicleSpriteKey, 'ninja'>;

interface VehiclePhoto {
  src: string;
  label: string;
  /** Riding environment shown behind the bike when `scene` is on (public/background). */
  scene: string;
}

/**
 * Real side-profile photos (transparent cut-outs in public/vehicles, facing right).
 * Every archetype must have one, so a missing photo is a compile error rather than a blank card.
 */
const PHOTOS: Record<SilhouetteKind, VehiclePhoto> = {
  scooter: { src: 'vehicles/hc125.webp', label: 'Honda Click 125', scene: 'background/cityhighway.webp' },
  maxi: { src: 'vehicles/nmax155.webp', label: 'Yamaha NMAX 155', scene: 'background/cityhighway.webp' },
  underbone: { src: 'vehicles/hw125.webp', label: 'Honda Wave 125', scene: 'background/cityhighway.webp' },
  naked: { src: 'vehicles/kz250.webp', label: 'Kawasaki Z250', scene: 'background/highway.webp' },
  supersport: { src: 'vehicles/zx6r.webp', label: 'Kawasaki Ninja ZX-6R', scene: 'background/track.webp' },
  adventure: { src: 'vehicles/g310.webp', label: 'BMW G 310 GS', scene: 'background/trailway.webp' },
  cruiser: { src: 'vehicles/kvs300.webp', label: 'Kawasaki Vulcan S', scene: 'background/highway.webp' }
};

/**
 * Side-profile photo of a vehicle archetype, standing on a shared ground line so all models line up.
 * With `scene`, the bike is shown on the road it is built for (city, highway, track or trail).
 */
@Component({
  selector: 'app-vehicle-silhouette',
  templateUrl: './vehicle-silhouette.html',
  styleUrl: './vehicle-silhouette.css',
  host: {
    '[class.with-scene]': 'scene()',
    '[style.background-image]': "scene() ? 'url(' + photo().scene + ')' : null"
  }
})
export class VehicleSilhouette {
  readonly kind = input.required<VehicleSpriteKey>();
  readonly scene = input(false, { transform: booleanAttribute });

  readonly photo = computed(() => {
    const kind = this.kind();
    return PHOTOS[kind === 'ninja' ? 'supersport' : kind];
  });

  readonly ariaLabel = computed(() => `${this.photo().label} side profile`);
}
