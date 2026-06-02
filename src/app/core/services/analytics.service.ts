import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { distinctUntilChanged, filter, map, startWith } from 'rxjs';

type MatomoCommand = [string, ...unknown[]];

declare global {
  interface Window {
    _paq?: MatomoCommand[];
  }
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private router = inject(Router);
  private isRedVariation = false;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadMatomo();
    this.trackPageChanges();
  }

  private loadMatomo(): void {
    const queue = (window._paq = window._paq || []); //array con mensajes q enviamos a matomo (config y datos). los vamos pusheando.

    queue.push(['enableLinkTracking']); //sirve para saber si ha salido de relevo pulsando un enlace de la web
    queue.push(['enableHeartBeatTimer', 15]); //sirve para contar el tiempo q lleva conect en la web
    queue.push(['setTrackerUrl', 'https://upcmin2.matomo.cloud/matomo.php']); //indico dirección a donde se deben enviar las métricas
    queue.push(['setSiteId', '1']); //el subdominio para ver las analytics no es SOLAMENTE para 1 web, te permite recoger datos de varias. con site id aquí indicas d q web

    queue.push([
      'AbTesting::create',
      {
        name: 'relevo_rojo',
        percentage: 100,
        includedTargets: [{ attribute: 'url', inverted: '0', type: 'equals_simple', value: 'http://localhost:4200' }],
        excludedTargets: [],
        variations: [
          {
            name: 'original',
            activate: () => {
              this.isRedVariation = false;
              this.updateAbTestStyle();
            }
          },
          {
            name: 'Rojo',
            activate: () => {
              this.isRedVariation = true;
              this.updateAbTestStyle();
            }
          }
        ],
        trigger: () => true
      }
    ]);

    const script = this.document.createElement('script'); //vamos a inyectar un js q nos bajamos de matomo en nuestro html
    script.async = true;
    script.src = 'https://cdn.matomo.cloud/upcmin2.matomo.cloud/matomo.js';
    this.document.head.appendChild(script); //metemos el <script ...js de matomo... </script> en el head del html
  }

  private trackPageChanges(): void {
    //funcion para registrar los saltos de pag en la web de relevo
    this.router.events //usamos el router de angular
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd), //solo se queda con los cierres de pantalla
        map(() => window.location.href), //coge la url
        startWith(window.location.href),
        distinctUntilChanged() //si llega 2 veces misma url repetida, cuento 1 en evz de 2
      )
      .subscribe((url) => {
        this.updateAbTestStyle();
        window._paq?.push(['setCustomUrl', url]);
        window._paq?.push(['setDocumentTitle', this.document.title]);
        window._paq?.push(['trackPageView']);
      });
  }

  private updateAbTestStyle(): void {
    const isLandingPage = window.location.pathname === '/';
    this.document.documentElement.style.filter =
      this.isRedVariation && isLandingPage ? 'sepia(1) saturate(15) hue-rotate(305deg)' : '';
  }
}
