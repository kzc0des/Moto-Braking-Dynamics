import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'workbench/:bikeId/analytics',
    renderMode: RenderMode.Client
  },
  {
    path: 'workbench/:bikeId/simulation',
    renderMode: RenderMode.Client
  },
  {
    path: 'workbench/:bikeId',
    renderMode: RenderMode.Client
  },
  {
    path: 'configure',
    renderMode: RenderMode.Client
  },
  {
    path: 'not-found',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
