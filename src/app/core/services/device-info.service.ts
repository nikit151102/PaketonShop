// device-info.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, forkJoin, fromEvent, merge } from 'rxjs';
import { map, catchError, startWith } from 'rxjs/operators';

export interface DeviceInfo {
  userAgent: string;
  browser: {
    name: string;
    version: string;
    engine: string;
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  };
  os: {
    name: string;
    version: string;
    platform: string;
  };
  screen: {
    width: number;
    height: number;
    availWidth: number;
    availHeight: number;
    colorDepth: number;
    pixelDepth: number;
    orientation: string;
    viewportWidth: number;
    viewportHeight: number;
  };
  network: {
    online: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
    language: string;
    languages: readonly string[];
    cookieEnabled: boolean;
  };
  hardware: {
    concurrency: number;
    deviceMemory?: number;
    maxTouchPoints: number;
    pdfViewerEnabled: boolean;
  };
  time: {
    timezone: string;
    offset: number;
    locale: string;
    now: string;
    performance: number;
  };
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  ip?: {
    ip: string;
    city?: string;
    country?: string;
    isp?: string;
  };
  battery?: {
    charging: boolean;
    level: number;
    chargingTime: number;
    dischargingTime: number;
  };
  storage: {
    cookies: string;
    localStorageSize: number;
    sessionStorageSize: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class DeviceInfoService {
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Получить всю информацию об устройстве и пользователе
   */
  async getAllInfo(): Promise<DeviceInfo> {
    const info: any = {
      userAgent: this.getUserAgent(),
      browser: this.getBrowserInfo(),
      os: this.getOSInfo(),
      screen: this.getScreenInfo(),
      network: this.getNetworkInfo(),
      hardware: this.getHardwareInfo(),
      time: this.getTimeInfo(),
      storage: this.getStorageInfo()
    };

    // IP информация (асинхронно)
    try {
      info.ip = await this.getIPInfo();
    } catch (error) {
      console.warn('IP info not available:', error);
    }

    // Информация о батарее (асинхронно, если доступно)
    try {
      if (this.isBrowser && (navigator as any).getBattery) {
        info.battery = await this.getBatteryInfo();
      }
    } catch (error) {
      console.warn('Battery info not available:', error);
    }

    return info as DeviceInfo;
  }

  /**
   * Получить всю информацию в виде Observable
   */
  getAllInfoObservable(): Observable<DeviceInfo> {
    return from(this.getAllInfo());
  }

  /**
   * Получить информацию о геолокации (требует разрешения пользователя)
   */
  getLocation(): Promise<DeviceInfo['location']> {
    return new Promise((resolve, reject) => {
      if (!this.isBrowser || !navigator.geolocation) {
        reject('Geolocation not supported');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        (error) => reject(error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Отслеживать изменения размера экрана
   */
  onResize(): Observable<DeviceInfo['screen']> {
    if (!this.isBrowser) {
      return of(this.getScreenInfo());
    }

    return merge(
      of(this.getScreenInfo()),
      fromEvent(window, 'resize').pipe(
        map(() => this.getScreenInfo())
      )
    );
  }

  /**
   * Отслеживать изменения состояния сети
   */
  onNetworkChange(): Observable<DeviceInfo['network']> {
    if (!this.isBrowser) {
      return of(this.getNetworkInfo());
    }

    return merge(
      of(this.getNetworkInfo()),
      fromEvent(window, 'online').pipe(
        map(() => this.getNetworkInfo())
      ),
      fromEvent(window, 'offline').pipe(
        map(() => this.getNetworkInfo())
      )
    );
  }

  /**
   * Определить браузер и устройство
   */
  private parseUserAgent(): { browser: any; os: any } {
    const ua = navigator.userAgent;
    let browser: any = {};
    let os: any = {};

    // Определение браузера
    if (/chrome|chromium|crios/i.test(ua)) {
      browser.name = 'Chrome';
      browser.engine = 'Blink';
    } else if (/firefox|fxios/i.test(ua)) {
      browser.name = 'Firefox';
      browser.engine = 'Gecko';
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      browser.name = 'Safari';
      browser.engine = 'WebKit';
    } else if (/opr|opera/i.test(ua)) {
      browser.name = 'Opera';
      browser.engine = 'Blink';
    } else if (/trident|msie/i.test(ua)) {
      browser.name = 'Internet Explorer';
      browser.engine = 'Trident';
    } else if (/edg/i.test(ua)) {
      browser.name = 'Edge';
      browser.engine = 'Blink';
    } else {
      browser.name = 'Unknown';
      browser.engine = 'Unknown';
    }

    // Определение ОС
    if (/windows/i.test(ua)) {
      os.name = 'Windows';
    } else if (/macintosh|mac os x/i.test(ua)) {
      os.name = 'macOS';
    } else if (/linux/i.test(ua)) {
      os.name = 'Linux';
    } else if (/android/i.test(ua)) {
      os.name = 'Android';
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      os.name = 'iOS';
    } else {
      os.name = 'Unknown';
    }

    // Версии (упрощенно)
    const chromeMatch = ua.match(/Chrome\/([\d.]+)/);
    const firefoxMatch = ua.match(/Firefox\/([\d.]+)/);
    const safariMatch = ua.match(/Version\/([\d.]+).*Safari/);
    
    browser.version = chromeMatch?.[1] || firefoxMatch?.[1] || safariMatch?.[1] || 'Unknown';

    // Мобильное устройство
    browser.isMobile = /mobile/i.test(ua);
    browser.isTablet = /tablet/i.test(ua);
    browser.isDesktop = !browser.isMobile && !browser.isTablet;

    os.platform = navigator.platform;

    return { browser, os };
  }

  private getUserAgent(): string {
    return this.isBrowser ? navigator.userAgent : '';
  }

  private getBrowserInfo(): DeviceInfo['browser'] {
    if (!this.isBrowser) {
      return {
        name: 'Unknown',
        version: 'Unknown',
        engine: 'Unknown',
        isMobile: false,
        isTablet: false,
        isDesktop: true
      };
    }

    const { browser } = this.parseUserAgent();
    return browser;
  }

  private getOSInfo(): DeviceInfo['os'] {
    if (!this.isBrowser) {
      return {
        name: 'Unknown',
        version: 'Unknown',
        platform: 'Unknown'
      };
    }

    const { os } = this.parseUserAgent();
    return os;
  }

  private getScreenInfo(): DeviceInfo['screen'] {
    if (!this.isBrowser) {
      return {
        width: 0,
        height: 0,
        availWidth: 0,
        availHeight: 0,
        colorDepth: 0,
        pixelDepth: 0,
        orientation: 'unknown',
        viewportWidth: 0,
        viewportHeight: 0
      };
    }

    return {
      width: screen.width,
      height: screen.height,
      availWidth: screen.availWidth,
      availHeight: screen.availHeight,
      colorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      orientation: screen.orientation?.type || 'unknown',
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    };
  }

  private getNetworkInfo(): DeviceInfo['network'] {
    if (!this.isBrowser) {
      return {
        online: true,
        language: 'unknown',
        languages: [],
        cookieEnabled: false
      };
    }

    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;

    return {
      online: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
      saveData: connection?.saveData,
      language: navigator.language || 'unknown',
      languages: navigator.languages || [],
      cookieEnabled: navigator.cookieEnabled
    };
  }

  private getHardwareInfo(): DeviceInfo['hardware'] {
    if (!this.isBrowser) {
      return {
        concurrency: 0,
        maxTouchPoints: 0,
        pdfViewerEnabled: false
      };
    }

    return {
      concurrency: navigator.hardwareConcurrency || 0,
      deviceMemory: (navigator as any).deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints || 0,
      pdfViewerEnabled: navigator.pdfViewerEnabled || false
    };
  }

  private getTimeInfo(): DeviceInfo['time'] {
    if (!this.isBrowser) {
      return {
        timezone: 'unknown',
        offset: 0,
        locale: 'unknown',
        now: new Date().toISOString(),
        performance: 0
      };
    }

    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offset: new Date().getTimezoneOffset(),
      locale: Intl.DateTimeFormat().resolvedOptions().locale,
      now: new Date().toISOString(),
      performance: performance.now()
    };
  }

  private async getIPInfo(): Promise<DeviceInfo['ip']> {
    if (!this.isBrowser) {
      return { ip: 'unknown' };
    }

    try {
      // Попробуем несколько сервисов по очереди
      const services = [
        'https://api.ipify.org?format=json',
        'https://ipapi.co/json/',
        'https://api.my-ip.io/v2/ip.json'
      ];

      for (const service of services) {
        try {
          const response: any = await this.http.get(service).toPromise();
          
          if (service.includes('ipify')) {
            return { ip: response.ip };
          } else if (service.includes('ipapi')) {
            return {
              ip: response.ip,
              city: response.city,
              country: response.country_name,
              isp: response.org
            };
          } else if (service.includes('my-ip')) {
            return { ip: response.ip };
          }
        } catch (error) {
          continue; // Пробуем следующий сервис
        }
      }
      
      return { ip: 'unknown' };
    } catch (error) {
      console.error('Error getting IP info:', error);
      return { ip: 'unknown' };
    }
  }

  private async getBatteryInfo(): Promise<DeviceInfo['battery']> {
    if (!this.isBrowser || !(navigator as any).getBattery) {
      return undefined;
    }

    try {
      const battery = await (navigator as any).getBattery();
      return {
        charging: battery.charging,
        level: Math.round(battery.level * 100),
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
    } catch (error) {
      console.warn('Could not get battery info:', error);
      return undefined;
    }
  }

  private getStorageInfo(): DeviceInfo['storage'] {
    if (!this.isBrowser) {
      return {
        cookies: '',
        localStorageSize: 0,
        sessionStorageSize: 0
      };
    }

    return {
      cookies: document.cookie,
      localStorageSize: localStorage.length,
      sessionStorageSize: sessionStorage.length
    };
  }

  /**
   * Быстрая проверка типа устройства
   */
  isMobileDevice(): boolean {
    return this.isBrowser && /mobile/i.test(navigator.userAgent);
  }

  /**
   * Получить информацию о поддержке WebGL
   */
  getWebGLInfo(): any {
    if (!this.isBrowser) {
      return { supported: false };
    }

    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl && gl instanceof WebGLRenderingContext) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        supported: true,
        renderer: debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown',
        vendor: debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown'
      };
    }
    
    return { supported: false };
  }
}