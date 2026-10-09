import { Injectable, signal, effect } from '@angular/core';

export type AppTheme = 'dark' | 'light';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  readonly currentTheme = signal<AppTheme>('dark');

  constructor() {
    // Check localStorage or default to dark
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('moto_theme') as AppTheme | null;
      if (saved === 'light' || saved === 'dark') {
        this.currentTheme.set(saved);
      }

      effect(() => {
        const theme = this.currentTheme();
        localStorage.setItem('moto_theme', theme);
        if (theme === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.add('light');
          document.documentElement.classList.remove('dark');
        }
      });
    }
  }

  toggleTheme(): void {
    this.currentTheme.update(t => t === 'dark' ? 'light' : 'dark');
  }
}
