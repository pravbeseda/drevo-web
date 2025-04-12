import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
    {
        path: 'article/edit/:id',
        renderMode: RenderMode.Client,
    },
    {
        path: '**',
        renderMode: RenderMode.Prerender,
    },
];
