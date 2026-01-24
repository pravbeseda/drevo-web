import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
    {
        path: 'articles/edit/:id',
        renderMode: RenderMode.Client,
    },
    {
        path: 'articles/:id',
        renderMode: RenderMode.Server,
    },
    {
        path: '**',
        renderMode: RenderMode.Server,
    },
];
