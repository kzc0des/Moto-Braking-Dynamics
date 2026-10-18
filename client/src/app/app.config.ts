import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, RouteReuseStrategy, BaseRouteReuseStrategy, ActivatedRouteSnapshot } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { routes } from './app.routes';
import { errorInterceptor } from './core/api/error.interceptor';
import { Workbench } from './workbench/workbench';

export class WorkbenchRouteReuseStrategy extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    if (future.component === Workbench && curr.component === Workbench) {
      return true;
    }
    return future.routeConfig === curr.routeConfig;
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: RouteReuseStrategy, useClass: WorkbenchRouteReuseStrategy },
    provideHttpClient(withInterceptors([errorInterceptor])),
    provideClientHydration(withEventReplay())
  ]
};
