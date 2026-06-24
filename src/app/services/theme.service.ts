import { Injectable, signal } from '@angular/core';

export interface Theme {
  name: string;
  label: string;
}

export const THEMES: Theme[] = [
  { name: 'spring', label: 'Spring' },
  { name: 'summer', label: 'Summer' },
  { name: 'fall', label: 'Fall' },
  { name: 'winter', label: 'Winter' },
];

export const ACCENT_NAMES = [
  'rosewater', 'flamingo', 'pink', 'mauve',
  'red', 'maroon', 'peach', 'yellow',
  'green', 'teal', 'sky', 'sapphire',
  'blue', 'lavender',
] as const;

export type AccentName = (typeof ACCENT_NAMES)[number];

const THEME_ACCENTS: Record<string, AccentName> = {
  spring: 'green',
  summer: 'yellow',
  fall: 'peach',
  winter: 'pink',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly themes = THEMES;
  readonly accentNames = ACCENT_NAMES;
  readonly activeTheme = signal(this.loadTheme());
  readonly activeAccent = signal<AccentName>(this.loadAccent(this.activeTheme()));

  setTheme(name: string): void {
    const accent = THEME_ACCENTS[name] || 'peach';
    this.activeTheme.set(name);
    this.activeAccent.set(accent);
    this.applyTheme(name);
    this.applyAccent(accent);
    localStorage.setItem('ctp-theme', name);
    localStorage.setItem('ctp-accent', accent);
  }

  setAccent(name: AccentName): void {
    this.activeAccent.set(name);
    this.applyAccent(name);
    localStorage.setItem('ctp-accent', name);
  }

  init(): void {
    this.applyTheme(this.activeTheme());
    this.applyAccent(this.activeAccent());
  }

  private applyTheme(name: string): void {
    const el = document.documentElement;
    THEMES.forEach((t) => el.classList.remove(t.name));
    if (name !== 'winter') {
      el.classList.add(name);
    }
  }

  private applyAccent(name: AccentName): void {
    document.documentElement.style.setProperty('--accent', `var(--${name})`);
  }

  private loadTheme(): string {
    const stored = localStorage.getItem('ctp-theme');
    const legacy: Record<string, string> = {
      latte: 'spring',
      frappe: 'summer',
      macchiato: 'fall',
      mocha: 'winter',
    };
    const theme = stored ? legacy[stored] || stored : 'winter';

    return THEMES.some((t) => t.name === theme) ? theme : 'winter';
  }

  private loadAccent(theme: string): AccentName {
    const stored = localStorage.getItem('ctp-accent') as AccentName | null;
    return stored || THEME_ACCENTS[theme] || 'peach';
  }
}
