import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DomSanitizer } from '@angular/platform-browser';
import { MarketplaceHomeComponent } from './marketplace-home.component';
import { OfertaService } from '../../../core/services/oferta.service';
import { MarketplaceSearchService } from '../../../core/services/marketplace-search.service';
import { AuthService } from '../../../core/services/auth.service';
import { SolicitudService } from '../../../core/services/solicitud.service';
import { TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';

describe('MarketplaceHomeComponent', () => {
  let fixture: ComponentFixture<MarketplaceHomeComponent>;
  let component: MarketplaceHomeComponent;

  const searchQuery = signal('technology');
  const authServiceStub = {
    isLoggedIn: signal(true),
    isPro: signal(false),
    isInterested: signal(true),
    currentUser: signal({ _id: 'user-1', roles: ['INTERESTED'] })
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MarketplaceHomeComponent],
      providers: [
        {
          provide: OfertaService,
          useValue: {
            getOfertasPaged: vi.fn().mockReturnValue(
              of({
                items: [],
                pagination: {
                  page: 1,
                  limit: 24,
                  totalItems: 0,
                  totalPages: 1,
                  hasNextPage: false,
                  hasPrevPage: false
                }
              })
            ),
            getMisFavoritas: vi.fn().mockReturnValue(of([]))
          }
        },
        {
          provide: MarketplaceSearchService,
          useValue: {
            query: searchQuery
          }
        },
        {
          provide: AuthService,
          useValue: authServiceStub
        },
        {
          provide: SolicitudService,
          useValue: {
            getMisSolicitudesEnviadas: vi.fn().mockReturnValue(of([]))
          }
        },
        {
          provide: TranslateService,
          useValue: {
            instant: (value: string) => value
          }
        },
        {
          provide: DomSanitizer,
          useValue: {
            bypassSecurityTrustResourceUrl: (value: string) => value
          }
        }
      ]
    })
      .overrideComponent(MarketplaceHomeComponent, {
        set: { template: '' }
      })
      .compileComponents();

    fixture = TestBed.createComponent(MarketplaceHomeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should lock results after the first 12 for free users when search is active', () => {
    component.ofertas.set(
      Array.from({ length: 13 }, (_, index) => ({
        _id: `offer-${index}`,
        region: `Region ${index}`,
        sector: 'Technology',
        companyDescription: `Offer ${index}`,
        detailViewCount: 0,
        favoriteCount: 0
      }))
    );

    expect(component.isBlurredResult(11)).toBe(false);
    expect(component.isBlurredResult(12)).toBe(true);
    expect(component.cardRoute('offer-12', 12)).toEqual(['/pago-simulado', 'pro']);
  });
});
