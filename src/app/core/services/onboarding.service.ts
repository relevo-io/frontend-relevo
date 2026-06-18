import { Injectable, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export interface OnboardingStep {
  target: string;
  eyebrow: string;
  title: string;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private authService = inject(AuthService);
  private router = inject(Router);

  private readonly pendingKey = 'relevo_onboarding_pending';
  readonly steps: OnboardingStep[] = [
    {
      target: '[data-tour="brand"]',
      eyebrow: 'ONBOARDING.STEP1_EYEBROW',
      title: 'ONBOARDING.STEP1_TITLE',
      body: 'ONBOARDING.STEP1_BODY'
    },
    {
      target: '[data-tour="search"]',
      eyebrow: 'ONBOARDING.STEP2_EYEBROW',
      title: 'ONBOARDING.STEP2_TITLE',
      body: 'ONBOARDING.STEP2_BODY'
    },
    {
      target: '[data-tour="offer-card"]',
      eyebrow: 'ONBOARDING.STEP3_EYEBROW',
      title: 'ONBOARDING.STEP3_TITLE',
      body: 'ONBOARDING.STEP3_BODY'
    },
    {
      target: '[data-tour="sell-now"]',
      eyebrow: 'ONBOARDING.STEP4_EYEBROW',
      title: 'ONBOARDING.STEP4_TITLE',
      body: 'ONBOARDING.STEP4_BODY'
    }
  ];

  isActive = signal(false);
  currentIndex = signal(0);
  private launchScheduled = false;
  private isAdvancing = false;

  constructor() {
    effect(() => {
      const user = this.authService.currentUser();
      if (!user?._id || !this.shouldLaunchFor(user._id)) return;
      if (this.isActive() || this.launchScheduled) return;

      this.launchScheduled = true;
      this.router.navigate(['/']).then(() => {
        setTimeout(() => {
          this.start();
          this.launchScheduled = false;
        }, 350);
      });
    });
  }

  markPending(): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.pendingKey, '1');
  }

  start(): void {
    if (this.isActive()) return;
    this.currentIndex.set(0);
    this.isActive.set(true);
  }

  previous(): void {
    this.currentIndex.update((index) => Math.max(0, index - 1));
  }

  next(): void {
    if (this.isAdvancing) return;
    this.isAdvancing = true;

    if (this.currentIndex() >= this.steps.length - 1) {
      this.finish();
      this.isAdvancing = false;
      return;
    }
    this.currentIndex.update((index) => index + 1);
    setTimeout(() => {
      this.isAdvancing = false;
    }, 180);
  }

  skip(): void {
    this.finish();
  }

  finish(): void {
    const userId = this.authService.currentUser()?._id;
    if (typeof localStorage !== 'undefined') {
      if (userId) localStorage.setItem(this.completedKey(userId), '1');
      localStorage.removeItem(this.pendingKey);
    }
    this.isActive.set(false);
    this.launchScheduled = false;
    this.isAdvancing = false;
  }

  private shouldLaunchFor(userId: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(this.pendingKey) === '1' && localStorage.getItem(this.completedKey(userId)) !== '1';
  }

  private completedKey(userId: string): string {
    return `relevo_onboarding_completed_${userId}`;
  }
}
