import { pictureResolver } from './resolvers/picture.resolver';
import { Route } from '@angular/router';

export const PICTURES_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () => import('./pages/picture-page/picture-page.component').then(m => m.PicturePageComponent),
    },
    {
        path: ':id',
        loadComponent: () =>
            import('./pages/picture-detail/picture-detail.component').then(m => m.PictureDetailComponent),
        resolve: { picture: pictureResolver },
        data: { titleSource: 'picture' },
    },
];
