import { Component, OnInit, inject, signal, effect, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MentoringService } from '../../../core/services/mentoring.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../../core/services/auth.service';
import { MentoringModule, MentoringItem } from '../../../core/models/mentoring.model';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownComponent } from 'ngx-markdown';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';

@Component({
  selector: 'app-mentoring',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MarkdownComponent,
    MatTabsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatListModule,
    MatExpansionModule
  ],
  templateUrl: './mentoring.component.html',
  styleUrl: './mentoring.component.css'
})
export class MentoringComponent implements OnInit {
  private mentoringService = inject(MentoringService);
  public languageService = inject(LanguageService);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);

  modules = signal<MentoringModule[]>([]);
  isLoading = signal<boolean>(true);

  // Tab index or route selection: 0 for BUY, 1 for SELL
  activeTab = signal<number>(0);

  // Currently selected step for reading
  selectedItem = signal<{ module: MentoringModule; item: MentoringItem } | null>(null);
  markdownContent = signal<string>('');
  isLoadingContent = signal<boolean>(false);

  // Set of completed content keys
  completedKeys = signal<Set<string>>(new Set());

  constructor() {
    // Reactive update of markdown content when selected item or language changes
    effect(() => {
      const itemData = this.selectedItem();
      const currentLang = this.languageService.languageCode();
      if (itemData) {
        this.fetchMarkdown(itemData.module.route, itemData.item.contentKey, currentLang);
      }
    });

    // Reactive update of progress when user changes
    effect(() => {
      const user = this.authService.currentUser();
      if (isPlatformBrowser(this.platformId)) {
        this.loadProgress();
      }
    });
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.loadModules();
      this.loadProgress();
    }
  }

  loadModules(): void {
    this.isLoading.set(true);
    this.mentoringService.getModules().subscribe({
      next: (data) => {
        // Sort modules by order
        const sorted = data.sort((a, b) => a.order - b.order);
        this.modules.set(sorted);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error fetching modules', err);
        this.isLoading.set(false);
      }
    });
  }

  loadProgress(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.authService.isLoggedIn()) {
      this.completedKeys.set(new Set());
      return;
    }
    this.mentoringService.getProgress().subscribe({
      next: (progress) => {
        if (progress && Array.isArray(progress.completedSteps)) {
          this.completedKeys.set(new Set(progress.completedSteps));
        } else {
          this.completedKeys.set(new Set());
        }
      },
      error: (err) => {
        console.error('Failed to load mentoring progress from database', err);
      }
    });
  }

  markAsCompleted(contentKey: string): void {
    if (this.completedKeys().has(contentKey)) return;
    this.toggleCompleted(contentKey);
  }

  toggleCompleted(contentKey: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.mentoringService.toggleStep(contentKey).subscribe({
      next: (progress) => {
        if (progress && Array.isArray(progress.completedSteps)) {
          this.completedKeys.set(new Set(progress.completedSteps));
        }
      },
      error: (err) => {
        console.error('Failed to toggle step progress on backend', err);
      }
    });
  }

  fetchMarkdown(route: string, contentKey: string, lang: string): void {
    this.isLoadingContent.set(true);
    this.mentoringService.getModuleContent(route, contentKey, lang).subscribe({
      next: (markdown) => {
        this.markdownContent.set(markdown);
        this.isLoadingContent.set(false);
      },
      error: (err) => {
        console.error('Error loading markdown content', err);
        this.markdownContent.set('Error cargando el contenido.');
        this.isLoadingContent.set(false);
      }
    });
  }

  selectItem(module: MentoringModule, item: MentoringItem): void {
    this.selectedItem.set({ module, item });
  }

  closeReader(): void {
    this.selectedItem.set(null);
    this.markdownContent.set('');
  }

  // Helper selectors
  get buyModules() {
    return this.modules().filter((m) => m.route === 'BUY' && m.isActive);
  }

  get sellModules() {
    return this.modules().filter((m) => m.route === 'SELL' && m.isActive);
  }

  getRouteProgress(route: 'BUY' | 'SELL'): number {
    const routeModules = this.modules().filter((m) => m.route === route && m.isActive);
    let totalItems = 0;
    let completedCount = 0;
    for (const mod of routeModules) {
      totalItems += mod.items.length;
      for (const item of mod.items) {
        if (this.completedKeys().has(item.contentKey)) {
          completedCount++;
        }
      }
    }
    if (totalItems === 0) return 0;
    return Math.round((completedCount / totalItems) * 100);
  }

  getModuleProgress(module: MentoringModule): number {
    const totalItems = module.items.length;
    if (totalItems === 0) return 0;
    const completedCount = module.items.filter((item) => this.completedKeys().has(item.contentKey)).length;
    return Math.round((completedCount / totalItems) * 100);
  }
}
