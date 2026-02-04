import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { StorageUtils } from '../../../utils/storage.utils';
import { localStorageEnvironment } from '../../../environment';
import { UserDataService } from '../services/user-data.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  // Исключения - URL, для которых не нужно отправлять данные устройства
  private excludedUrls = [
    '/assets/',
    '.json',
    'ipapi.co',
    'nominatim.openstreetmap.org',
    'api.ipify.org',
    'песочница.пакетон.рф' // Добавляем ваш домен с кириллицей
  ];

  constructor(private userDataService: UserDataService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Проверяем, нужно ли исключить URL
    if (this.isExcludedUrl(req.url)) {
      return next.handle(req);
    }

    // Создаем observable, который добавляет заголовки асинхронно
    return from(this.addHeaders(req)).pipe(
      mergeMap(requestWithHeaders => next.handle(requestWithHeaders))
    );
  }

  /**
   * Проверка на исключения
   */
  private isExcludedUrl(url: string): boolean {
    return this.excludedUrls.some(excluded => {
      // Для кириллических доменов проверяем в Punycode
      const excludedEncoded = this.encodeToASCII(excluded);
      const urlEncoded = this.encodeToASCII(url);
      return urlEncoded.includes(excludedEncoded);
    });
  }

  /**
   * Кодирование строки для проверки URL
   */
  private encodeToASCII(str: string): string {
    try {
      // Конвертируем Punycode для кириллических доменов
      return str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch {
      return str.toLowerCase();
    }
  }

  /**
   * Кодирование значения заголовка в ASCII-совместимый формат
   */
  private encodeHeaderValue(value: string): string {
    try {
      // Кодируем в base64 для безопасной передачи
      return btoa(encodeURIComponent(value));
    } catch (error) {
      console.warn('Failed to encode header value:', error);
      // Если не удалось закодировать, возвращаем только ASCII символы
      return value.replace(/[^\x00-\x7F]/g, '');
    }
  }

  /**
   * Декодирование значения заголовка из ASCII-совместимого формата
   */
  private decodeHeaderValue(encodedValue: string): string {
    try {
      return decodeURIComponent(atob(encodedValue));
    } catch {
      return encodedValue;
    }
  }

  /**
   * Добавление заголовков к запросу
   */
  private async addHeaders(req: HttpRequest<any>): Promise<HttpRequest<any>> {
    const headers: { [key: string]: string } = {};

    // Добавляем токен авторизации
    const token = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Добавляем данные устройства и пользователя
    try {
      const deviceHeaders = await this.userDataService.getHeadersData();
      
      // Кодируем все значения заголовков, которые могут содержать не-ASCII символы
      Object.keys(deviceHeaders).forEach(key => {
        const value = deviceHeaders[key];
        if (typeof value === 'string' && /[^\x00-\x7F]/.test(value)) {
          // Если есть не-ASCII символы, кодируем
          headers[key] = this.encodeHeaderValue(value);
          // Добавляем флаг, что заголовок закодирован
          headers[`${key}-Encoded`] = 'base64';
        } else {
          headers[key] = value;
        }
      });
    } catch (error) {
      console.warn('Could not add device headers:', error);
    }

    // Добавляем дополнительные заголовки
    headers['X-Requested-With'] = 'XMLHttpRequest';
    headers['X-App-Version'] = '1.0.0'; // Версия приложения

    // Добавляем Content-Type если его нет
    if (!req.headers.has('Content-Type')) {
      headers['Content-Type'] = 'application/json';
    }

    return req.clone({
      setHeaders: headers
    });
  }
}