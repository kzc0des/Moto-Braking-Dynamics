import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { BenchmarkStore } from '../../state/benchmark.store';
import { GarageService } from '../services/garage.service';

export const vehicleSetupGuard: CanActivateFn = () => {
  const store = inject(BenchmarkStore);
  const garage = inject(GarageService);
  const router = inject(Router);

  if (store.isVehicleConfigured() || garage.hasVehicles()) {
    return true;
  }

  // If vehicle has not been chosen/configured, redirect to /setup onboarding
  return router.createUrlTree(['/setup']);
};
