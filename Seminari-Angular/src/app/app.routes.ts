import { Routes } from '@angular/router';
import { OportunidadList} from './components/oportunidades/oportunidad-list/oportunidad-list.component';
import { OportunidadDetalle } from './components/oportunidades/oportunidad-detalle/oportunidad-detalle.component';
import { PerfilUsuario} from './components/usuarios/perfil/perfil.component';
import { Login } from './components/usuarios/login/login.component';

export const routes: Routes = [ 
  { path: 'login', component: Login },
  { path: 'oportunidades', component: OportunidadList },
  { path: 'oportunidades/:id', component: OportunidadDetalle },
  { path: 'perfil', component: PerfilUsuario },

  { path: '', redirectTo: 'oportunidades', pathMatch: 'full' }, // Ruta por defecto
  { path: '**', redirectTo: 'oportunidades' } // Si ponen una URL rara, los manda al listado
];