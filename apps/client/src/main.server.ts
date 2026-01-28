import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';
import {
    bootstrapApplication,
    BootstrapContext,
} from '@angular/platform-browser';

// BootstrapContext carries per-request state for SSR (transfer state, providers, etc.)
const bootstrap = (context: BootstrapContext) =>
    bootstrapApplication(AppComponent, config, context);

export default bootstrap;
