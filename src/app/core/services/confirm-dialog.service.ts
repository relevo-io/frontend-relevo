import { Injectable, signal } from '@angular/core';

export interface ConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmDialogService {
  isOpen = signal<boolean>(false);
  config = signal<ConfirmConfig | null>(null);

  private resolveFn: ((value: boolean) => void) | null = null;

  ask(title: string, message: string, confirmText = 'Confirmar', cancelText = 'Cancelar'): Promise<boolean> {
    this.config.set({ title, message, confirmText, cancelText });
    this.isOpen.set(true);

    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  respond(result: boolean): void {
    if (this.resolveFn) {
      this.resolveFn(result);
      this.resolveFn = null;
    }
    this.isOpen.set(false);
    
    setTimeout(() => {
      this.config.set(null);
    }, 200);
  }
}
