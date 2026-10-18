import { Injectable } from '@angular/core';

/**
 * The whole site uses the dark "night road" theme. There is no light/dark switch,
 * so this service only makes sure the document is flagged as dark.
 */
@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  constructor() {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }
}
