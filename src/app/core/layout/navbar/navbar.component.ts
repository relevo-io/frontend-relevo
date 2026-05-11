import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { MarketplaceSearchService } from '../../services/marketplace-search.service';
import { LanguageSelectorComponent } from '../../../shared/components/language-selector/language-selector.component';
import { TranslateModule } from '@ngx-translate/core';
import { ThemeService } from '../../services/theme.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, FormsModule, LanguageSelectorComponent, TranslateModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
})
export class Navbar {
  public authService = inject(AuthService);
  public themeService = inject(ThemeService);
  private chatService = inject(ChatService);
  private router = inject(Router);
  private marketplaceSearchService = inject(MarketplaceSearchService);

  searchQuery = this.marketplaceSearchService.query;
  isMenuOpen = signal(false);
  unreadCount = signal(0);

  constructor() {
    this.chatService.totalUnread$.subscribe(count => this.unreadCount.set(count));
  }

  toggleMenu() {
    this.isMenuOpen.update(v => !v);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  onSearchInput(value: string): void {
    this.marketplaceSearchService.setQuery(value);
    if (!this.router.url.startsWith('/admin') && this.router.url !== '/') {
      this.router.navigate(['/']);
    }
  }

  goToSell(): void {
    this.router.navigate(['/ofertas/crear']);
  }

  getSessionActionLabel(): string {
    return this.authService.isAdmin() ? 'Dashboard' : 'Perfil';
  }

  getSessionActionRoute(): string {
    return this.authService.isAdmin() ? '/admin/dashboard' : '/perfil';
  }
}
