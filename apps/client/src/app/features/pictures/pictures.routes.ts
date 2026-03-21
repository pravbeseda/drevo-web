import { Route } from '@angular/router';

export const PICTURES_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () =>
            import('./pages/pictures-page/pictures-page.component').then(m => m.PicturesPageComponent),
    },
];
