import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { Workbench } from './workbench/workbench';
import { SetupHub } from './features/setup/setup-hub/setup-hub';
import { ConfigureStudio } from './features/setup/configure-studio/configure-studio';
import { NotFound } from './features/not-found/not-found';
import { vehicleSetupGuard } from './core/guards/vehicle-setup.guard';
import { onboardingBypassGuard } from './core/guards/onboarding-bypass.guard';
import { vehicleExistsGuard } from './core/guards/vehicle-exists.guard';
import { GarageService } from './core/services/garage.service';
import { BenchmarkStore } from './state/benchmark.store';

export const routes: Routes = [
  {
    path: 'setup',
    component: SetupHub,
    canActivate: [onboardingBypassGuard]
  },
  {
    path: 'configure',
    component: ConfigureStudio
  },
  {
    path: 'workbench/:bikeId/:tab',
    component: Workbench,
    canActivate: [vehicleSetupGuard, vehicleExistsGuard]
  },
  {
    path: 'workbench/:bikeId',
    pathMatch: 'full',
    redirectTo: (route) => {
      const bikeId = route.params['bikeId'];
      return `/workbench/${bikeId}/analytics`;
    }
  },
  {
    path: 'workbench',
    pathMatch: 'full',
    redirectTo: () => {
      const garage = inject(GarageService);
      const store = inject(BenchmarkStore);
      if (!store.isVehicleConfigured() && !garage.hasVehicles()) {
        return '/setup';
      }
      const activeId = garage.activeVehicleId() || (garage.hasVehicles() ? garage.vehicles()[0].id : 'baseline-scooter-125');
      return `/workbench/${activeId}/analytics`;
    }
  },
  {
    path: 'not-found',
    component: NotFound
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: () => {
      const garage = inject(GarageService);
      const store = inject(BenchmarkStore);
      if (!store.isVehicleConfigured() && !garage.hasVehicles()) {
        return '/setup';
      }
      const activeId = garage.activeVehicleId() || (garage.hasVehicles() ? garage.vehicles()[0].id : 'baseline-scooter-125');
      return `/workbench/${activeId}/analytics`;
    }
  },
  {
    path: '**',
    component: NotFound
  }
];
