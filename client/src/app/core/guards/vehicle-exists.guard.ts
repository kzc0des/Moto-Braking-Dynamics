import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { GarageService } from '../services/garage.service';

export const vehicleExistsGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const garage = inject(GarageService);
  const router = inject(Router);
  const bikeId = route.paramMap.get('bikeId');

  if (bikeId) {
    const vehicle = garage.getVehicleById(bikeId);
    if (!vehicle) {
      return router.createUrlTree(['/not-found'], {
        queryParams: { reason: 'vehicle', id: bikeId }
      });
    }
    // Validate tab if specified in route path
    const tab = route.paramMap.get('tab');
    if (tab && tab !== 'analytics' && tab !== 'simulation') {
      return router.createUrlTree(['/not-found'], {
        queryParams: { reason: 'route' }
      });
    }

    // Synchronize active vehicle in garage store if not already active
    if (garage.activeVehicleId() !== bikeId) {
      garage.setActiveVehicle(bikeId);
    }
  }

  return true;
};
