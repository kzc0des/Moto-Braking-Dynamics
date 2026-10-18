import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'workbench/:bikeId/:tab',
    renderMode: RenderMode.Client
  },
  {
    path: 'workbench/:bikeId',
    renderMode: RenderMode.Client
  },
  {
    path: 'workbench',
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
