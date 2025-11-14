import { Route } from '@angular/router';

export const appRoutes: Route[] = [
    {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
            import('./components/yii-iframe/yii-iframe.component').then(
                m => m.YiiIframeComponent
            ),
    },
    {
        path: 'main',
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
    // Wildcard route for all Yii pages
    // Must be last in the routes array
    {
        path: '**',
        loadComponent: () =>
            import('./components/yii-iframe/yii-iframe.component').then(
                m => m.YiiIframeComponent
            ),
    },
];
