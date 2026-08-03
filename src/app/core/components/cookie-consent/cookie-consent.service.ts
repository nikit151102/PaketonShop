import { Injectable, signal, computed } from '@angular/core';

export type CookieConsentStatus = 'accepted' | 'declined' | null;

export interface CookieConsentData {
  status: CookieConsentStatus;
  timestamp: number | null;
  version: number;
}

@Injectable({ providedIn: 'root' })
export class CookieConsentService {
  private readonly STORAGE_KEY = 'cookie_consent';
  private readonly CONSENT_VERSION = 1; 

  private consentData = signal<CookieConsentData>(this.loadConsent());
  
  readonly isAccepted = computed(() => this.consentData().status === 'accepted');
  readonly isDeclined = computed(() => this.consentData().status === 'declined');
  readonly shouldShowBanner = computed(() => {
    const data = this.consentData();
    return data.status === null || data.version < this.CONSENT_VERSION;
  });

  /**
   * Загрузка данных из localStorage
   */
  private loadConsent(): CookieConsentData {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return { status: null, timestamp: null, version: this.CONSENT_VERSION };
      
      const parsed = JSON.parse(raw) as CookieConsentData;
      
      // Если версия устарела — сбрасываем согласие
      if (parsed.version < this.CONSENT_VERSION) {
        return { status: null, timestamp: null, version: this.CONSENT_VERSION };
      }
      
      return parsed;
    } catch {
      return { status: null, timestamp: null, version: this.CONSENT_VERSION };
    }
  }

  /**
   * Сохранение выбора пользователя
   */
  private saveConsent(status: CookieConsentStatus): void {
    const data: CookieConsentData = {
      status,
      timestamp: Date.now(),
      version: this.CONSENT_VERSION
    };
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    this.consentData.set(data);
  }

  /**
   * Пользователь принял cookies
   */
  accept(): void {
    this.saveConsent('accepted');
    this.enableAnalytics();
  }

  /**
   * Пользователь отклонил cookies
   */
  decline(): void {
    this.saveConsent('declined');
    this.disableAnalytics();
  }

  /**
   * Сброс согласия (для тестов или повторного запроса)
   */
  reset(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.consentData.set({ status: null, timestamp: null, version: this.CONSENT_VERSION });
  }

  /**
   * Включение аналитики (вызывается при принятии)
   */
  private enableAnalytics(): void {

    // Пример: загрузка скрипта Яндекс.Метрики
    // this.loadYandexMetrika();
  }

  /**
   * Отключение аналитики (вызывается при отклонении)
   */
  private disableAnalytics(): void {
    // Здесь удалить cookies аналитики или остановить трекеры
  }

  /**
   * Проверка, можно ли загружать аналитику
   */
  canLoadAnalytics(): boolean {
    return this.isAccepted();
  }
}