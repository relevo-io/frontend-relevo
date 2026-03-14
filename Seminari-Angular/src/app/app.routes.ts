import { Routes } from '@angular/router';
import { OrganizacionList } from './organizacion-list/organizacion-list';
import { UsuarioList } from './usuario-list/usuario-list';

export const routes: Routes = [
  { path: '', component: OrganizacionList },
  { path: 'usuarios', component: UsuarioList },
];