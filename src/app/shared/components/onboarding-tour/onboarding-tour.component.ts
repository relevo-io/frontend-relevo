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
  private previousInlineStyles: Partial<CSSStyleDeclaration> = {};

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
    return {
      width: `${rect.width + 14}px`,
      height: `${rect.height + 14}px`,
      transform: `translate(${rect.left - 7}px, ${rect.top - 7}px)`
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
    if (this.highlightedElement === element) return;

    this.clearHighlightedElement();
    const style = window.getComputedStyle(element);

    this.highlightedElement = element;
    this.previousInlineStyles = {
      position: element.style.position,
      zIndex: element.style.zIndex,
      boxShadow: element.style.boxShadow,
      backgroundColor: element.style.backgroundColor,
      borderRadius: element.style.borderRadius
    };

    if (style.position === 'static') {
      element.style.position = 'relative';
    }
    element.style.zIndex = '9991';
    element.style.boxShadow = '0 0 0 5px rgba(205, 220, 255, 0.45), 0 12px 28px rgba(0, 0, 0, 0.18)';
    element.style.borderRadius = style.borderRadius === '0px' ? '16px' : style.borderRadius;

    if (style.backgroundColor === 'rgba(0, 0, 0, 0)' || style.backgroundColor === 'transparent') {
      element.style.backgroundColor = 'var(--surface-container-lowest)';
    }
  }

  private clearHighlightedElement(): void {
    if (!this.highlightedElement) return;

    this.highlightedElement.style.position = this.previousInlineStyles.position ?? '';
    this.highlightedElement.style.zIndex = this.previousInlineStyles.zIndex ?? '';
    this.highlightedElement.style.boxShadow = this.previousInlineStyles.boxShadow ?? '';
    this.highlightedElement.style.backgroundColor = this.previousInlineStyles.backgroundColor ?? '';
    this.highlightedElement.style.borderRadius = this.previousInlineStyles.borderRadius ?? '';
    this.highlightedElement = null;
    this.previousInlineStyles = {};
  }
}
