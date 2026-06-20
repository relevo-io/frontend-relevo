import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { OAuthProvider } from '../../../core/models/auth.model';
import { PLATFORM_ID } from '@angular/core';
import { OnboardingService } from '../../../core/services/onboarding.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './oauth-callback.component.html',
  styleUrl: './oauth-callback.component.css'
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private onboardingService = inject(OnboardingService);

  errorMessage = signal<string | null>(null);
  isLoading = signal(true);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const provider = this.route.snapshot.paramMap.get('provider') as OAuthProvider | null;
    const code = this.route.snapshot.queryParamMap.get('code');
    const state = this.route.snapshot.queryParamMap.get('state');

    if (!provider || !code) {
      this.failAndRedirect('Respuesta OAuth invalida');
      return;
    }

    const expectedState = localStorage.getItem(`oauth_state_${provider}`);
    const redirectUri = localStorage.getItem(`oauth_redirect_uri_${provider}`) || window.location.origin;

    if (!state || !expectedState || state !== expectedState) {
      this.failAndRedirect('No se ha podido validar la sesion OAuth');
      return;
    }

    localStorage.removeItem(`oauth_state_${provider}`);
    localStorage.removeItem(`oauth_redirect_uri_${provider}`);

    this.authService.completeOAuthLogin(provider, { code, redirectUri }).subscribe({
      next: (response) => {
        if (response.isNewUser) {
          this.onboardingService.markPending();
        }
        this.isLoading.set(false);
        this.router.navigate(['/']);
      },
      error: () => {
        this.failAndRedirect('No se pudo completar el login social');
      }
    });
  }

  private failAndRedirect(message: string): void {
    this.isLoading.set(false);
    this.errorMessage.set(message);
    setTimeout(() => this.router.navigate(['/login']), 1800);
  }
}
