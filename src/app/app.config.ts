import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import AuraBase from '@primeng/themes/aura/base';
import AuraCheckbox from '@primeng/themes/aura/checkbox';
import AuraSlider from '@primeng/themes/aura/slider';

// Load only the control themes used by the music panel. Its scoped styles own the colors.
const StudioPreset = definePreset({ ...AuraBase, components: { checkbox: AuraCheckbox, slider: AuraSlider } });

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    providePrimeNG({ theme: { preset: StudioPreset, options: { darkModeSelector: false } } }),
  ],
};
