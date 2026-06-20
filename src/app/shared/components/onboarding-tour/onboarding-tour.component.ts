import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, computed, effect, inject, signal } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { OnboardingService, OnboardingStep } from '../../../core/services/onboarding.service';

@Component({
  selector: 'app-onboarding-tour',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './onboarding-tour.component.html',
  styleUrl: './onboarding-tour.component.css'
})
export class OnboardingTourComponent implements OnDestroy {
  tour = inject(OnboardingService);
  rect = signal<DOMRect | null>(null);
  private highlightedElement: HTMLElement | null = null;
  private highlightedClone: HTMLElement | null = null;

  step = computed<OnboardingStep>(() => this.tour.steps[this.tour.currentIndex()]);
  progress = computed(() => `${this.tour.currentIndex() + 1} / ${this.tour.steps.length}`);
  isLast = computed(() => this.tour.currentIndex() === this.tour.steps.length - 1);

  constructor() {
    effect(() => {
      const isActive = this.tour.isActive();
      this.tour.currentIndex();
      if (!isActive) {
        this.clearHighlightedElement();
        return;
      }
      setTimeout(() => this.syncTarget(), 50);
    });
  }

  ngOnDestroy(): void {
    this.clearHighlightedElement();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  syncTarget(): void {
    if (!this.tour.isActive()) return;
    const element = document.querySelector(this.step().target);
    if (!element) {
      this.clearHighlightedElement();
      this.rect.set(null);
      return;
    }
    this.setHighlightedElement(element as HTMLElement);
    this.rect.set(element.getBoundingClientRect());
  }

  highlightStyle(): Record<string, string> {
    const rect = this.rect();
    if (!rect) return {};
    const padding = this.getHighlightPadding();
    return {
      width: `${rect.width + padding.x * 2}px`,
      height: `${rect.height + padding.y * 2}px`,
      transform: `translate(${rect.left - padding.x}px, ${rect.top - padding.y}px)`
    };
  }

  cardStyle(): Record<string, string> {
    const rect = this.rect();
    if (!rect) return {};

    const cardWidth = Math.min(420, window.innerWidth - 32);
    const left = Math.min(Math.max(16, rect.left), window.innerWidth - cardWidth - 16);
    const below = rect.bottom + 18;
    const top = below + 280 < window.innerHeight ? below : Math.max(16, rect.top - 300);

    return {
      width: `${cardWidth}px`,
      transform: `translate(${left}px, ${top}px)`
    };
  }

  private setHighlightedElement(element: HTMLElement): void {
    this.highlightedElement = element;
    this.renderHighlightedClone();
  }

  private clearHighlightedElement(): void {
    this.highlightedElement = null;
    this.highlightedClone?.remove();
    this.highlightedClone = null;
  }

  private renderHighlightedClone(): void {
    const element = this.highlightedElement;
    if (!element) return;

    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    const padding = this.getHighlightPadding();

    this.highlightedClone?.remove();

    const clone = element.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.classList.add('tour-target-clone');
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left - padding.x}px`;
    clone.style.top = `${rect.top - padding.y}px`;
    clone.style.width = `${rect.width + padding.x * 2}px`;
    clone.style.height = `${rect.height + padding.y * 2}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '9992';
    clone.style.pointerEvents = 'none';
    clone.style.boxSizing = 'border-box';
    clone.style.transform = 'none';
    clone.style.opacity = '1';
    clone.style.borderRadius = style.borderRadius === '0px' ? '16px' : style.borderRadius;
    clone.style.overflow = 'hidden';
    clone.style.boxShadow = '0 0 0 5px rgba(205, 220, 255, 0.45), 0 12px 28px rgba(0, 0, 0, 0.18)';

    if (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') {
      clone.style.backgroundColor = 'var(--surface-container-lowest)';
    }

    if (this.step().target === '[data-tour="brand"]') {
      clone.style.display = 'inline-flex';
      clone.style.alignItems = 'center';
      clone.style.justifyContent = 'center';
      clone.style.padding = '0 14px';
    }

    const cloneStyle = (selector: string, apply: (node: HTMLElement) => void) => {
      clone.querySelectorAll(selector).forEach((node) => apply(node as HTMLElement));
    };

    cloneStyle('.logo, .label, strong, span, a, button', (node) => {
      node.style.color = '#031632';
      node.style.opacity = '1';
    });

    cloneStyle('.material-symbols-outlined', (node) => {
      node.style.color = '#031632';
      node.style.opacity = '1';
    });

    cloneStyle('input, textarea, select', (node) => {
      node.style.background = '#ffffff';
      node.style.color = '#031632';
      node.style.borderColor = 'rgba(148, 163, 184, 0.6)';
      node.style.boxShadow = 'none';
      node.style.opacity = '1';
      node.style.filter = 'none';
    });

    cloneStyle('.btn-outline, .btn-user-trigger, .btn-navbar-help, .btn-navbar-bell', (node) => {
      node.style.background = '#ffffff';
      node.style.color = '#031632';
      node.style.borderColor = 'rgba(148, 163, 184, 0.6)';
      node.style.opacity = '1';
      node.style.filter = 'none';
    });

    cloneStyle('.btn-solid', (node) => {
      node.style.background = '#067647';
      node.style.color = '#ffffff';
      node.style.borderColor = '#067647';
      node.style.opacity = '1';
      node.style.filter = 'none';
    });

    cloneStyle('.user-avatar-sm', (node) => {
      node.style.color = '#ffffff';
      node.style.opacity = '1';
    });

    const clonedInputs = clone.querySelectorAll('input, textarea, select');
    const originalInputs = element.querySelectorAll('input, textarea, select');
    clonedInputs.forEach((input, index) => {
      const original = originalInputs[index] as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | undefined;
      if (!original) return;

      if (input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) {
        input.value = original.value;
      }

      if (input instanceof HTMLSelectElement && original instanceof HTMLSelectElement) {
        input.value = original.value;
      }
    });

    document.body.appendChild(clone);
    this.highlightedClone = clone;
  }

  private getHighlightPadding(): { x: number; y: number } {
    if (this.step().target === '[data-tour="brand"]') {
      return { x: 14, y: 10 };
    }

    return { x: 7, y: 7 };
  }
}
