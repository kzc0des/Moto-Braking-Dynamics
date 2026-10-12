import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { GarageService } from '../services/garage.service';

export const onboardingBypassGuard: CanActivateFn = () => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const garage = inject(GarageService);
  const router = inject(Router);

  if (garage.hasVehicles()) {
    return router.createUrlTree(['/workbench']);
  }

  return true;
};
