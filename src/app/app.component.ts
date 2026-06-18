import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastComponent } from './shared/components/toast/toast.component';
import { ConfirmDialogComponent } from './shared/components/confirm-dialog/confirm-dialog';
import { LanguageService } from './core/services/language.service';
import { ThemeService } from './core/services/theme.service';
import { FcmService } from './core/services/fcm.service';
import { AnalyticsService } from './core/services/analytics.service';
import { OnboardingTourComponent } from './shared/components/onboarding-tour/onboarding-tour.component';
import { OnboardingService } from './core/services/onboarding.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ToastComponent, ConfirmDialogComponent, OnboardingTourComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class App {
  private languageService = inject(LanguageService);
  private themeService = inject(ThemeService);
  private fcmService = inject(FcmService);
  private analyticsService = inject(AnalyticsService);
  private onboardingService = inject(OnboardingService);
  title = 'RELEVO';
}
