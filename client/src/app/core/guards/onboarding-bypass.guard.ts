import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivateFn, Router } from '@angular/router';
import { GarageService } from '../services/garage.service';

export const onboardingBypassGuard: CanActivateFn = (route) => {
  const platformId = inject(PLATFORM_ID);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  const garage = inject(GarageService);
  const router = inject(Router);

  // The workbench "Intro" button opens /setup?revisit=1 on purpose.
  if (route.queryParamMap.has('revisit')) {
    return true;
  }

  if (garage.hasVehicles()) {
    return router.createUrlTree(['/workbench']);
  }

  return true;
};
