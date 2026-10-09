import { Routes } from '@angular/router';
import { WorkbenchComponent } from './workbench/workbench.component';

export const routes: Routes = [
  {
    path: '',
    component: WorkbenchComponent
  },
  {
    path: '**',
    redirectTo: ''
  }
];
