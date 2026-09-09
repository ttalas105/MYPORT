import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// Every new visit starts across the street, before the scene reads scroll position.
history.scrollRestoration = 'manual';
window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
