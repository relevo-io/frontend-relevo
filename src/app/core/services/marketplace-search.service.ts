import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MarketplaceSearchService {
  query = signal<string>('');

  setQuery(value: string): void {
    this.query.set(value);
  }

  clear(): void {
    this.query.set('');
  }
}
