import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Oferta } from '../models/oferta.model';

const PENDING_OFFER_DRAFT_KEY = 'relevo_pending_offer_draft';

@Injectable({
  providedIn: 'root'
})
export class MonetizationService {
  private platformId = inject(PLATFORM_ID);

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  setPendingOfferDraft(oferta: Partial<Oferta>): void {
    if (!this.isBrowser) {
      return;
    }

    sessionStorage.setItem(PENDING_OFFER_DRAFT_KEY, JSON.stringify(oferta));
  }

  getPendingOfferDraft(): Partial<Oferta> | null {
    if (!this.isBrowser) {
      return null;
    }

    const raw = sessionStorage.getItem(PENDING_OFFER_DRAFT_KEY);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as Partial<Oferta>;
    } catch {
      return null;
    }
  }

  clearPendingOfferDraft(): void {
    if (!this.isBrowser) {
      return;
    }

    sessionStorage.removeItem(PENDING_OFFER_DRAFT_KEY);
  }
}
