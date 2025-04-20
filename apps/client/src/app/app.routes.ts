import { Route } from '@angular/router';

export const appRoutes: Route[] = [
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
