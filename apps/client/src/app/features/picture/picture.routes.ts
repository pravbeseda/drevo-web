import { Route } from '@angular/router';

export const PICTURES_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () => import('./pages/picture-page/picture-page.component').then(m => m.PicturePageComponent),
    },
];
