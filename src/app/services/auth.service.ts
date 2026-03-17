import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Por defecto, nadie está logueado (false)
  private loggedIn = new BehaviorSubject<boolean>(false);
  
  // Esta es la variable que el Navbar va a "escuchar"
  isLoggedIn$ = this.loggedIn.asObservable();

  constructor() { }

  login() {
    this.loggedIn.next(true); // Cambiamos el estado a logueado
  }

  logout() {
    this.loggedIn.next(false); // Cambiamos el estado a desconectado
  }
}