import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { RequesterType, RequestType, CreateAppealDto, AppealResponse } from '../interfaces/hotline.interface';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class HotlineService {
  // Базовый URL из env или конфиг
  private readonly apiUrl = environment.hotlone;

  constructor(private http: HttpClient) { }

  // GET: Типы заявителей
  getRequesterTypes(): Observable<RequesterType[]> {
    return this.http.get<RequesterType[]>(
      `${this.apiUrl}/public/requester-types/`
    ).pipe(
      tap(types => console.log(`✅ Загружено ${types.length} типов заявителей`)),
      catchError(this.handleError)
    );
  }

  // GET: Доступные типы обращений для заявителя
  getAvailableRequestTypes(requesterCode: string): Observable<RequestType[]> {
    return this.http.get<RequestType[]>(
      `${this.apiUrl}/public/request-types/allowed`,
      { params: { requester_code: requesterCode } }
    ).pipe(
      tap(types => console.log(`✅ Загружено ${types.length} типов обращений для ${requesterCode}`)),
      catchError(this.handleError)
    );
  }

  // POST: Создание обращения
  createAppeal(appeal: CreateAppealDto): Observable<AppealResponse> {
    const payload: CreateAppealDto = {
      ...appeal,
      acceptance_info: appeal.acceptance_info || 'Обращение из веб-интерфейса',
      administrator: appeal.administrator || 'Web User'
    };

    return this.http.post<AppealResponse>(
      `${this.apiUrl}/admin/journals/`,
      payload
    ).pipe(
      tap(response => console.log('✅ Обращение создано:', response)),
      catchError(this.handleError)
    );
  }

  // Обработчик ошибок
  private handleError(error: HttpErrorResponse): Observable<never> {
    console.error('❌ API Error:', error);
    
    let message = 'Произошла ошибка при отправке обращения';
    
    if (error.error instanceof ErrorEvent) {
      message = `Ошибка сети: ${error.error.message}`;
    } else {
      message = error.error?.message || `Ошибка сервера: ${error.status}`;
    }
    
    return throwError(() => new Error(message));
  }
}