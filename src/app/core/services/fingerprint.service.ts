import { Injectable } from '@angular/core';
import * as FingerprintJS from '@fingerprintjs/fingerprintjs';

@Injectable({
  providedIn: 'root'
})
export class FingerprintService {

  private visitorId: string | null = null;
  private fpPromise: Promise<any> | null = null;

  constructor() {
    this.fpPromise = FingerprintJS.load();
  }

  /**
   * Получение идентификатора устройства
   */
  async getVisitorId(): Promise<string> {
    if (this.visitorId) {
      return this.visitorId;
    }

    try {
      const fp = await this.fpPromise;
      const result = await fp.get();
      const id: string = result.visitorId;
      this.visitorId = id;
      return id;
    } catch (error) {
      console.error('Ошибка получения отпечатка:', error);
      throw error;
    }
  }

  /**
   * Получение полных данных компонентов отпечатка
   */
  async getFullData(): Promise<any> {
    try {
      const fp = await this.fpPromise;
      const result = await fp.get();
      return result;
    } catch (error) {
      console.error('Ошибка получения данных:', error);
      throw error;
    }
  }

  /**
   * Сброс кэшированного ID (пригодится при смене пользователя)
   */
  reset(): void {
    this.visitorId = null;
  }

  /**
   * Проверка доверенного устройства (имитация, на бэкенде делать)
   */
  async isTrustedDevice(trustedIds: string[]): Promise<boolean> {
    const id = await this.getVisitorId();
    return trustedIds.includes(id);
  }
}