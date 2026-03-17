import { Routes } from '@angular/router';
import { OportunidadListComponent} from './components/oportunidades/oportunidad-list/oportunidad-list.component';
import { OportunidadDetalle } from './components/oportunidades/oportunidad-detalle/oportunidad-detalle.component';
import { Login } from './components/usuarios/login/login.component';
import { Home } from './components/home/home.component';
import { UsuariosListComponent } from './components/usuarios/usuarios-list/usuarios-list.component';
import { PerfilComponent } from './components/usuarios/perfil/perfil.component';

export const routes: Routes = [ 
  { path: 'login', component: Login },
  { path: 'oportunidades', component: OportunidadListComponent },
  { path: 'oportunidades/:id', component: OportunidadDetalle },
  { path: 'usuarios', component: UsuariosListComponent },
  { path: 'perfil', component: PerfilComponent  },
  { path: '', component: Home},
  { path: '**', redirectTo: '' } // Si ponen una URL rara, los manda al listado
];
