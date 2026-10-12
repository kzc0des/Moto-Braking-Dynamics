import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { BenchmarkStore } from '../../state/benchmark.store';
import { GarageService } from '../services/garage.service';

export const vehicleSetupGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const store = inject(BenchmarkStore);
  const garage = inject(GarageService);
  const router = inject(Router);

  if (store.isVehicleConfigured() || garage.hasVehicles()) {
    return true;
  }

  // If vehicle has not been chosen/configured, redirect to /setup onboarding
  return router.createUrlTree(['/setup']);
};
