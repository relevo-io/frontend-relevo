import { Component, ElementRef, ViewChild, inject, signal, AfterViewChecked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AssistantService } from '../../../core/services/assistant.service';
import { AuthService } from '../../../core/services/auth.service';
import { AssistantSource } from '../../../core/models/assistant.model';

interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
  sources?: AssistantSource[];
}

@Component({
  selector: 'app-assistant',
  standalone: true,
  imports: [FormsModule, DatePipe, RouterLink],
  templateUrl: './assistant.component.html',
  styleUrl: './assistant.component.css'
})
export class AssistantComponent implements AfterViewChecked {
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;

  private assistantService = inject(AssistantService);
  authService = inject(AuthService);

  messages = signal<AssistantMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Hola, soy el asistente de Relevo. Puedo ayudarte con dudas sobre la plataforma y las empresas disponibles.',
      createdAt: new Date()
    }
  ]);
  messageInput = signal('');
  isSending = signal(false);

  private shouldScrollToBottom = true;

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage(): void {
    const content = this.messageInput().trim();
    if (!content || this.isSending()) return;

    this.messages.set([
      ...this.messages(),
      {
        id: `user-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date()
      }
    ]);
    this.messageInput.set('');
    this.isSending.set(true);
    this.shouldScrollToBottom = true;

    this.assistantService.ask(content).subscribe({
      next: (response) => {
        this.messages.set([
          ...this.messages(),
          {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: this.formatAssistantAnswer(response.answer),
            sources: response.sources,
            createdAt: new Date()
          }
        ]);
        this.isSending.set(false);
        this.shouldScrollToBottom = true;
      },
      error: () => {
        this.messages.set([
          ...this.messages(),
          {
            id: `assistant-error-${Date.now()}`,
            role: 'assistant',
            content:
              'Ahora mismo no puedo responder. Comprueba que el backend, Weaviate y el modelo de IA estan activos.',
            createdAt: new Date()
          }
        ]);
        this.isSending.set(false);
        this.shouldScrollToBottom = true;
      }
    });
  }

  onInputChange(value: string): void {
    this.messageInput.set(value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  private scrollToBottom(): void {
    const el = this.messagesContainer?.nativeElement;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  private formatAssistantAnswer(answer: string): string {
    return answer
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/__(.*?)__/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .trim();
  }
}
