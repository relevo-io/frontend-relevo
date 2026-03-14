import { Routes } from '@angular/router';
import { OportunidadList} from './components/oportunidades/oportunidad-list/oportunidad-list.component';
import { OportunidadDetalle } from './components/oportunidades/oportunidad-detalle/oportunidad-detalle.component';
import { PerfilUsuario} from './components/usuarios/perfil/perfil.component';
import { Login } from './components/usuarios/login/login.component';
import { Home } from './components/home/home.component';

export const routes: Routes = [ 
  { path: 'login', component: Login },
  { path: 'oportunidades', component: OportunidadList },
  { path: 'oportunidades/:id', component: OportunidadDetalle },
  { path: 'perfil', component: PerfilUsuario },

  { path: '', component: Home},
  { path: '**', redirectTo: '' } // Si ponen una URL rara, los manda al listado
];