// encryption.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environment';
import * as CryptoJS from 'crypto-js';

@Injectable({
  providedIn: 'root'
})
export class EncryptionService {
  private isBrowser: boolean;
  private readonly encryptionKey = environment.encryptionKey;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Генерация уникального ключа шифрования на основе данных устройства
   */
  private generateDeviceKey(deviceInfo?: any): string {
    if (!this.isBrowser || !deviceInfo) {
      return this.encryptionKey + 'server-side';
    }
    
    const browser = deviceInfo.browser || {};
    const os = deviceInfo.os || {};
    const screen = deviceInfo.screen || {};
    
    // Создаем уникальный ключ на основе комбинации параметров устройства
    const keyParts = [
      this.encryptionKey,
      browser.name?.substring(0, 3) || 'unk',
      os.name?.substring(0, 3) || 'unk',
      screen.width?.toString().substring(0, 3) || '000',
      screen.height?.toString().substring(0, 3) || '000',
      deviceInfo.time?.timezone?.substring(0, 3) || 'unk'
    ];
    
    return keyParts.join('|');
  }

  /**
   * Шифрование данных с использованием AES
   */
  encrypt(data: any, deviceInfo?: any): string {
    const key = this.generateDeviceKey(deviceInfo);
    const jsonString = JSON.stringify(data);
    
    return CryptoJS.AES.encrypt(jsonString, key).toString();
  }

  /**
   * Дешифрование данных
   */
  decrypt(encryptedData: string, deviceInfo?: any): any {
    try {
      const key = this.generateDeviceKey(deviceInfo);
      const bytes = CryptoJS.AES.decrypt(encryptedData, key);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      return null;
    }
  }

  /**
   * Простое шифрование для заголовков (base64)
   */
  encryptForHeader(data: any): string {
    const jsonString = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(jsonString)));
  }

  /**
   * Простое дешифрование для заголовков
   */
  decryptFromHeader(encodedData: string): any {
    try {
      const decoded = decodeURIComponent(escape(atob(encodedData)));
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Header decryption error:', error);
      return null;
    }
  }
}