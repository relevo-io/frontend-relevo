import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AssistantChatRequest, AssistantChatResponse } from '../models/assistant.model';

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/api/assistant`;

  ask(message: string): Observable<AssistantChatResponse> {
    const body: AssistantChatRequest = { message };
    return this.http.post<AssistantChatResponse>(`${this.apiUrl}/chat`, body);
  }
}
