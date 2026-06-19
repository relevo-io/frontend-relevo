import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ChatService } from '../../services/chat.service';
import { FcmService } from '../../services/fcm.service';
import { NotificationService } from '../../services/notification.service';
import { MarketplaceSearchService } from '../../services/marketplace-search.service';
import { TranslateService } from '@ngx-translate/core';
import { NotificationHistoryService } from '../../services/notification-history.service';
import { AlertaService } from '../../services/alerta.service';
import { OnboardingService } from '../../services/onboarding.service';
import { vi, type Mocked } from 'vitest';

import { Navbar } from './navbar.component';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;
  let routerSpy: Mocked<Pick<Router, 'navigate' | 'navigateByUrl' | 'events' | 'url'>>;

  beforeEach(async () => {
    routerSpy = {
      navigate: vi.fn(),
      navigateByUrl: vi.fn(),
      url: '/',
      events: new Subject()
    };

    TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [
        {
          provide: AuthService,
          useValue: {
            currentUser: signal(null),
            isLoggedIn: signal(false),
            isAdmin: signal(false),
            isInterested: signal(false),
            isPro: signal(false),
            logout: vi.fn()
          }
        },
        {
          provide: ThemeService,
          useValue: {
            currentTheme: signal('light'),
            toggleTheme: vi.fn()
          }
        },
        {
          provide: ChatService,
          useValue: {
            totalUnread$: of(0),
            newNotification$: of()
          }
        },
        {
          provide: FcmService,
          useValue: {
            permissionState: signal('default'),
            notificationsEnabled: signal(false),
            requestNotificationPermission: vi.fn().mockResolvedValue('default'),
            disableNotifications: vi.fn().mockResolvedValue(undefined),
            updateNotificationPreferences: vi.fn().mockReturnValue(of({ success: true, user: null }))
          }
        },
        {
          provide: NotificationService,
          useValue: {
            success: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            info: vi.fn()
          }
        },
        {
          provide: MarketplaceSearchService,
          useValue: {
            query: signal(''),
            setQuery: vi.fn()
          }
        },
        {
          provide: TranslateService,
          useValue: {
            instant: (value: string) => value
          }
        },
        {
          provide: NotificationHistoryService,
          useValue: {
            notificationRead$: of(),
            notificationsReadByType$: of(),
            getNotifications: vi.fn().mockReturnValue(
              of({
                items: [],
                unreadCount: 0,
                pagination: { page: 1, totalPages: 1, hasNextPage: false }
              })
            ),
            markReadByType: vi.fn().mockReturnValue(of({})),
            markAsRead: vi.fn().mockReturnValue(of({})),
            markAllAsRead: vi.fn().mockReturnValue(of({ success: true })),
            deleteNotification: vi.fn().mockReturnValue(of({ success: true })),
            clearAll: vi.fn().mockReturnValue(of({ success: true }))
          }
        },
        {
          provide: AlertaService,
          useValue: {
            getAlertas: vi.fn().mockReturnValue(of([])),
            createAlerta: vi.fn().mockReturnValue(of({})),
            deleteAlerta: vi.fn().mockReturnValue(of({}))
          }
        },
        {
          provide: OnboardingService,
          useValue: {
            start: vi.fn()
          }
        },
        {
          provide: Router,
          useValue: routerSpy
        }
      ]
    }).overrideComponent(Navbar, {
      set: { template: '' }
    });

    await TestBed.compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect guests to login when they try to search', () => {
    component.onSearchInput('tech');

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/' }
    });
  });
});
