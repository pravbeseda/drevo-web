import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
    {
        path: '',
        renderMode: RenderMode.Client,
    },
    {
        path: 'main',
        renderMode: RenderMode.Prerender,
    },
    {
        path: 'editor',
        renderMode: RenderMode.Client,
    },
    {
        path: '**',
        renderMode: RenderMode.Client,
    },
];
