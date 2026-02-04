import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';
import { DeviceInfoService } from './device-info.service';
import { EncryptionService } from './encryption.service';

export interface UserData {
  deviceInfo?: any;
  encryptedDeviceData?: string;
  city?: string;
  userPreferences?: any;
  sessionId?: string;
  timestamp?: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserDataService {
  private isBrowser: boolean;
  private userData = new BehaviorSubject<UserData>({});
  private sessionId: string = '';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private deviceInfoService: DeviceInfoService,
    private encryptionService: EncryptionService
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    this.initSession();
    this.loadUserData();
  }

  /**
   * Инициализация сессии
   */
  private initSession(): void {
    if (!this.isBrowser) return;

    // Генерация или загрузка ID сессии
    this.sessionId = localStorage.getItem('user_session_id') || 
                    this.generateSessionId();
    
    localStorage.setItem('user_session_id', this.sessionId);
  }

  /**
   * Генерация уникального ID сессии
   */
  private generateSessionId(): string {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Загрузка сохраненных данных пользователя
   */
  private loadUserData(): void {
    if (!this.isBrowser) return;

    try {
      const savedData = localStorage.getItem('user_data');
      if (savedData) {
        const decrypted = this.encryptionService.decryptFromHeader(savedData);
        if (decrypted) {
          this.userData.next(decrypted);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  }

  /**
   * Сохранение данных пользователя
   */
  private saveUserData(data: UserData): void {
    if (!this.isBrowser) return;

    try {
      const encrypted = this.encryptionService.encryptForHeader(data);
      localStorage.setItem('user_data', encrypted);
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  /**
   * Получить полные данные пользователя
   */
  async getUserData(): Promise<UserData> {
    const currentData = this.userData.getValue();
    
    // Если данные уже собраны и актуальны (менее 5 минут назад)
    if (currentData.deviceInfo && this.isDataFresh(currentData)) {
      return currentData;
    }

    // Сбор новых данных
    const deviceInfo = await this.deviceInfoService.getCompleteDeviceInfo();
    const encryptedDeviceData = this.encryptionService.encrypt(deviceInfo);
    const city = deviceInfo.detectedCity;

    const newUserData: UserData = {
      deviceInfo: deviceInfo,
      encryptedDeviceData: encryptedDeviceData,
      city: city,
      userPreferences: currentData.userPreferences || {},
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };

    this.userData.next(newUserData);
    this.saveUserData(newUserData);

    return newUserData;
  }

  /**
   * Проверка актуальности данных
   */
  private isDataFresh(data: UserData): boolean {
    if (!data.timestamp) return false;
    
    const dataTime = new Date(data.timestamp).getTime();
    const currentTime = new Date().getTime();
    const fiveMinutes = 5 * 60 * 1000; // 5 минут в миллисекундах
    
    return (currentTime - dataTime) < fiveMinutes;
  }

  /**
   * Получить данные для заголовков HTTP
   */
  async getHeadersData(): Promise<any> {
    const userData = await this.getUserData();
    const minimalData = await this.deviceInfoService.getMinimalDeviceInfo();
    
    return {
      'X-Device-Data': this.encryptionService.encryptForHeader(minimalData),
      'X-User-Session': userData.sessionId,
      'X-User-City': userData.city || 'Unknown',
      'X-Timestamp': new Date().toISOString()
    };
  }

  /**
   * Обновить пользовательские предпочтения
   */
  updateUserPreferences(preferences: any): void {
    const currentData = this.userData.getValue();
    const newData: UserData = {
      ...currentData,
      userPreferences: {
        ...currentData.userPreferences,
        ...preferences
      },
      timestamp: new Date().toISOString()
    };

    this.userData.next(newData);
    this.saveUserData(newData);
  }

  /**
   * Получить текущий город пользователя
   */
  getCurrentCity(): string {
    return this.userData.getValue().city || 'Unknown';
  }

  /**
   * Обновить город вручную
   */
  setCity(city: string): void {
    const currentData = this.userData.getValue();
    const newData: UserData = {
      ...currentData,
      city: city,
      timestamp: new Date().toISOString()
    };

    this.userData.next(newData);
    this.saveUserData(newData);
  }

  /**
   * Observable с данными пользователя
   */
  getUserData$(): Observable<UserData> {
    return this.userData.asObservable();
  }
}