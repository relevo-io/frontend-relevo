import { Injectable, inject, PLATFORM_ID, signal, effect, RendererFactory2 } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { AuthService } from './auth.service';
import { UsuarioService } from './usuario.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private platformId = inject(PLATFORM_ID);
  private rendererFactory = inject(RendererFactory2);
  private renderer = this.rendererFactory.createRenderer(null, null);

  public currentTheme = signal<'light' | 'dark'>('light');

  constructor() {
    this.initTheme();

    // Sincronizar con el usuario logeado si cambia
    effect(() => {
      const user = this.authService.currentUser();
      if (
        user &&
        user.theme &&
        (user.theme === 'light' || user.theme === 'dark') &&
        user.theme !== this.currentTheme()
      ) {
        this.setTheme(user.theme as 'light' | 'dark', false);
      }
    });

    // Aplicar clase al body cuando el signal cambia
    effect(() => {
      const theme = this.currentTheme();
      this.applyTheme(theme);
    });
  }

  private initTheme() {
    if (isPlatformBrowser(this.platformId)) {
      const savedTheme = localStorage.getItem('preferred_theme') as 'light' | 'dark';

      // Si no hay guardado, podemos intentar detectar preferencia del sistema
      let defaultTheme: 'light' | 'dark' = 'light';
      if (savedTheme === 'light' || savedTheme === 'dark') {
        defaultTheme = savedTheme;
      } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        defaultTheme = 'dark';
      }

      this.setTheme(defaultTheme, false);
    }
  }

  setTheme(theme: 'light' | 'dark', updateBackend = true) {
    this.currentTheme.set(theme);

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('preferred_theme', theme);
    }

    if (updateBackend) {
      const user = this.authService.currentUser();
      if (user && user._id) {
        this.usuarioService.updateUsuarioTheme(user._id, theme).subscribe({
          next: (updatedUser) => {
            this.authService.currentUser.set(updatedUser);
            localStorage.setItem('user_data', JSON.stringify(updatedUser));
          },
          error: (err) => console.error('Error updating theme in backend', err)
        });
      }
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme() === 'light' ? 'dark' : 'light';
    this.setTheme(newTheme);
  }

  private applyTheme(theme: 'light' | 'dark') {
    if (isPlatformBrowser(this.platformId)) {
      if (theme === 'dark') {
        this.renderer.addClass(document.body, 'dark-mode');
      } else {
        this.renderer.removeClass(document.body, 'dark-mode');
      }
    }
  }
}
