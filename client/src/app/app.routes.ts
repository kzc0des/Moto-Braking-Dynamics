import { Routes } from '@angular/router';
import { Workbench } from './workbench/workbench';
import { SetupHub } from './features/setup/setup-hub/setup-hub';
import { ConfigureStudio } from './features/setup/configure-studio/configure-studio';
import { vehicleSetupGuard } from './core/guards/vehicle-setup.guard';
import { onboardingBypassGuard } from './core/guards/onboarding-bypass.guard';

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
    path: 'workbench',
    component: Workbench,
    canActivate: [vehicleSetupGuard]
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'workbench'
  },
  {
    path: '**',
    redirectTo: 'workbench'
  }
];
