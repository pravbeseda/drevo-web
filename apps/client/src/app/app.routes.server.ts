import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
    {
        path: 'articles/:id',
        renderMode: RenderMode.Server,
    },
    {
        path: '**',
        renderMode: RenderMode.Client,
    },
];
