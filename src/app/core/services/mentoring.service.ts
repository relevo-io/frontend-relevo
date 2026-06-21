import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { MentoringModule, MentoringProgress } from '../models/mentoring.model';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MentoringService {
  private http = inject(HttpClient);

  private apiUrl = `${environment.apiUrl}/api/mentoring`;

  getModules(): Observable<MentoringModule[]> {
    return this.http.get<MentoringModule[]>(`${this.apiUrl}/modules`);
  }

  getModuleContent(route: string, contentKey: string, lang: string): Observable<string> {
    return this.http.get(`${this.apiUrl}/content/${route}/${contentKey}`, {
      params: { lang },
      responseType: 'text'
    });
  }

  getProgress(): Observable<MentoringProgress> {
    return this.http.get<MentoringProgress>(`${this.apiUrl}/progress`);
  }

  toggleStep(contentKey: string): Observable<MentoringProgress> {
    return this.http.post<MentoringProgress>(`${this.apiUrl}/progress/toggle-step`, { contentKey });
  }
}
