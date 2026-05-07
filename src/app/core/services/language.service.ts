import { Injectable, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from './auth.service';
import { UsuarioService } from './usuario.service';
import { effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private translate = inject(TranslateService);
  private authService = inject(AuthService);
  private usuarioService = inject(UsuarioService);
  private platformId = inject(PLATFORM_ID);

  public languageCode = signal<string>('es');

  constructor() {
    this.initLanguage();

    effect(() => {
      const user = this.authService.currentUser();
      if (user && user.language && user.language !== this.languageCode()) {
        this.setLanguage(user.language, false);
      }
    });
  }

  private initLanguage() {
    if (isPlatformBrowser(this.platformId)) {
      const savedLang = localStorage.getItem('preferred_language');
      const browserLang = this.translate.getBrowserLang() || 'es';
      const defaultLang = savedLang || (['es', 'ca', 'en'].includes(browserLang) ? browserLang : 'es');
      
      this.setLanguage(defaultLang, false);
    }
  }

  setLanguage(lang: string, updateBackend: boolean = true) {
    this.translate.use(lang);
    this.languageCode.set(lang);
    
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('preferred_language', lang);
    }

    if (updateBackend) {
      const user = this.authService.currentUser();
      if (user && user._id) {
        this.usuarioService.updateUsuarioLanguage(user._id, lang).subscribe({
          next: (updatedUser) => {
            this.authService.currentUser.set(updatedUser);
            localStorage.setItem('user_data', JSON.stringify(updatedUser));
          },
          error: (err) => console.error('Error updating language in backend', err)
        });
      }
    }
  }
}
