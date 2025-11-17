import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { LoggerService } from './app/services/logger/logger.service';

const logger = new LoggerService();

bootstrapApplication(AppComponent, appConfig).catch(err => {
    logger.error('Failed to bootstrap Angular application', err);
});
