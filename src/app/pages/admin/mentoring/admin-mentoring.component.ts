import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MarkdownComponent } from 'ngx-markdown';
import { MentoringService } from '../../../core/services/mentoring.service';
import { LanguageService } from '../../../core/services/language.service';
import { MentoringItem, MentoringModule, MentoringProgress } from '../../../core/models/mentoring.model';

@Component({
  selector: 'app-admin-mentoring',
  standalone: true,
  imports: [CommonModule, TranslateModule, MarkdownComponent],
  templateUrl: './admin-mentoring.component.html',
  styleUrl: './admin-mentoring.component.css'
})
export class AdminMentoringComponent implements OnInit {
  private mentoringService = inject(MentoringService);
  private languageService = inject(LanguageService);

  modules = signal<MentoringModule[]>([]);
  progress = signal<MentoringProgress | null>(null);
  selectedModule = signal<MentoringModule | null>(null);
  selectedItem = signal<MentoringItem | null>(null);
  markdownContent = signal('');

  isLoading = signal(true);
  isLoadingContent = signal(false);
  error = signal<string | null>(null);
  routeFilter = signal<'ALL' | 'BUY' | 'SELL'>('ALL');

  filteredModules = computed(() => {
    const route = this.routeFilter();
    return this.modules().filter((module) => route === 'ALL' || module.route === route);
  });

  activeModules = computed(() => this.modules().filter((module) => module.isActive).length);

  ngOnInit(): void {
    this.fetchModules();
    this.fetchProgress();
  }

  fetchModules(): void {
    this.error.set(null);
    this.isLoading.set(true);

    this.mentoringService.getModules().subscribe({
      next: (modules) => {
        const sortedModules = [...modules].sort((a, b) => a.order - b.order);
        this.modules.set(sortedModules);
        if (!this.selectedModule() && sortedModules.length > 0) {
          this.selectedModule.set(sortedModules[0]);
        }
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Error loading mentoring modules', err);
        this.error.set('No se pudieron cargar los modulos de mentoring.');
        this.isLoading.set(false);
      }
    });
  }

  fetchProgress(): void {
    this.mentoringService.getProgress().subscribe({
      next: (progress) => this.progress.set(progress),
      error: (err) => {
        console.error('Error loading mentoring progress', err);
        this.progress.set(null);
      }
    });
  }

  updateRouteFilter(event: Event): void {
    this.routeFilter.set((event.target as HTMLSelectElement).value as 'ALL' | 'BUY' | 'SELL');
  }

  selectModule(module: MentoringModule): void {
    this.selectedModule.set(module);
    this.selectedItem.set(null);
    this.markdownContent.set('');
  }

  viewItem(module: MentoringModule, item: MentoringItem): void {
    this.selectedModule.set(module);
    this.selectedItem.set(item);
    this.isLoadingContent.set(true);

    this.mentoringService
      .getModuleContent(module.route, item.contentKey, this.languageService.languageCode())
      .subscribe({
        next: (content) => {
          this.markdownContent.set(content);
          this.isLoadingContent.set(false);
        },
        error: (err) => {
          console.error('Error loading mentoring content', err);
          this.markdownContent.set('No se pudo cargar el contenido markdown de este item.');
          this.isLoadingContent.set(false);
        }
      });
  }

  moduleProgress(module: MentoringModule): number {
    const completed = new Set(this.progress()?.completedSteps ?? []);
    if (module.items.length === 0) return 0;
    const done = module.items.filter((item) => completed.has(item.contentKey)).length;
    return Math.round((done / module.items.length) * 100);
  }

  isStepCompleted(item: MentoringItem): boolean {
    return new Set(this.progress()?.completedSteps ?? []).has(item.contentKey);
  }
}
