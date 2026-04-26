import { Routes } from '@angular/router';
import { PublicLayoutComponent } from './core/layout/public-layout/public-layout.component';
import { AdminLayoutComponent } from './pages/admin/admin-layout/admin-layout.component';

// --- GUARDS ---
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';

// --- PAGES ---
import { Home as LandingComponent } from './pages/landing/home.component';
import { MarketplaceHomeComponent } from './pages/landing/marketplace-home/marketplace-home.component';
import { Login as LoginComponent } from './pages/auth/login/login.component';
import { RegisterComponent } from './pages/auth/register/register.component';
import { OfertaListComponent } from './pages/public/ofertas/oferta-list/oferta-list.component';
import { OfertaDetalle } from './pages/public/ofertas/oferta-detalle/oferta-detalle.component';
import { OfertaCreateComponent } from './pages/public/ofertas/oferta-create/oferta-create.component';
import { UsuariosListComponent } from './pages/public/usuarios/usuarios-list.component';
import { PerfilComponent } from './pages/public/perfil/perfil.component';
import { AvisoLegalComponent } from './pages/legal/aviso-legal/aviso-legal.component';
import { TerminosServicioComponent } from './pages/legal/terminos-servicio/terminos-servicio.component';
import { PoliticaPrivacidadComponent } from './pages/legal/politica-privacidad/politica-privacidad.component';

// Admin Pages
import { DashboardComponent } from './pages/admin/dashboard/dashboard.component';
import { Usuarios as AdminUsuariosComponent } from './pages/admin/usuarios/usuarios';
import { Ofertas as OfertasAdminComponent } from './pages/admin/ofertas/ofertas';
import { SolicitudesComponent } from './pages/admin/solicitudes/solicitudes-list';

export const routes: Routes = [
  // --- MUNDO PÚBLICO ---
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: MarketplaceHomeComponent },
      { path: 'como-funciona', component: LandingComponent },
      { path: 'login', component: LoginComponent },
      { path: 'register', component: RegisterComponent },
      { path: 'ofertas', component: OfertaListComponent },
      { path: 'ofertas/crear', component: OfertaCreateComponent, canActivate: [authGuard] },
      { path: 'ofertas/:id', component: OfertaDetalle },
      { path: 'aviso-legal', component: AvisoLegalComponent },
      { path: 'terminos-servicio', component: TerminosServicioComponent },
      { path: 'politica-privacidad', component: PoliticaPrivacidadComponent },
      { path: 'usuarios', component: UsuariosListComponent },
      { 
        path: 'perfil', 
        component: PerfilComponent,
        canActivate: [authGuard] // Protegemos el perfil
      },
    ]
  },

  // --- MUNDO ADMIN (Totalmente protegido) ---
  {
    path: 'admin',
    component: AdminLayoutComponent,
    canActivate: [authGuard, adminGuard], // Doble capa: logueado + admin
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'usuarios', component: AdminUsuariosComponent },
      { path: 'ofertas', component: OfertasAdminComponent },
      { path: 'solicitudes', component: SolicitudesComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];

