import { Routes } from '@angular/router';
import { Home } from './components/home/home.component';
import { Login } from './components/usuarios/login/login.component';
import { OportunidadListComponent } from './components/oportunidades/oportunidad-list/oportunidad-list.component';
import { OportunidadDetalle } from './components/oportunidades/oportunidad-detalle/oportunidad-detalle.component';
import { UsuariosListComponent } from './components/usuarios/usuarios-list/usuarios-list.component';
import { PerfilComponent } from './components/usuarios/perfil/perfil.component';

// Layouts
import { PublicLayoutComponent } from './components/shared/public-layout/public-layout.component';
import { AdminLayoutComponent } from './components/admin/admin-layout/admin-layout.component';

// Admin Pages
import { DashboardComponent } from './components/admin/dashboard/dashboard.component';

export const routes: Routes = [
  // --- MUNDO PÚBLICO ---
  {
    path: '',
    component: PublicLayoutComponent,
    children: [
      { path: '', component: Home },
      { path: 'login', component: Login },
      { path: 'oportunidades', component: OportunidadListComponent },
      { path: 'oportunidades/:id', component: OportunidadDetalle },
      { path: 'usuarios', component: UsuariosListComponent },
      { path: 'perfil', component: PerfilComponent },
    ]
  },

  // --- MUNDO ADMIN ---
  {
    path: 'admin',
    component: AdminLayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];
