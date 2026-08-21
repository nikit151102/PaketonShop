import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // 🔒 Редиректы только в браузере
        if (isPlatformBrowser(this.platformId)) {
          if (error.status === 401) {
            this.router.navigate(['/auth/login']);
          } else if (error.status === 403) {
            this.router.navigate(['/forbidden']);
          }
        }
        return throwError(() => error);
      }),
    );
  }
}