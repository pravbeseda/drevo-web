import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
            import('./pages/main/main.component').then(
                m => m.MainComponent
            ),
    },
    {
        path: 'editor',
        loadComponent: () =>
            import('./pages/shared-editor/shared-editor.component').then(
                m => m.SharedEditorComponent
            ),
    },
    // {
    //     path: '**',
    //     redirectTo: 'article/edit',
    // },
];
