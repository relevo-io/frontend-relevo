import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive, TranslateModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css'
})
export class AdminLayoutComponent {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  public languageService = inject(LanguageService);

  isMenuOpen = signal(false);
  readonly currentUser = this.authService.currentUser;
  readonly languages = [
    { code: 'ca', label: 'CA' },
    { code: 'es', label: 'ES' },
    { code: 'en', label: 'EN' }
  ];

  readonly userInitial = computed(() => this.currentUser()?.fullName?.charAt(0)?.toUpperCase() || 'A');
  readonly userRoleLabel = computed(() => {
    const roles = this.currentUser()?.roles ?? [];
    if (roles.includes('ADMIN')) return 'ADMIN.ROLE_SUPER_ADMIN';
    if (roles.includes('OWNER')) return 'COMMON.ROLE_OWNER';
    if (roles.includes('INTERESTED')) return 'COMMON.ROLE_INTERESTED';
    return 'PROFILE.DEFAULT_USER';
  });

  toggleMenu(): void {
    this.isMenuOpen.update((value) => !value);
  }

  closeMenu(): void {
    this.isMenuOpen.set(false);
  }

  logout(): void {
    this.authService.logout();
    this.closeMenu();
  }

  setLanguage(code: string): void {
    this.languageService.setLanguage(code);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeMenu();
  }
}
