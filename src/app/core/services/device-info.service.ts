// device-info.service.ts
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, from, of, forkJoin, fromEvent, merge, BehaviorSubject } from 'rxjs';
import { map, catchError, startWith, take } from 'rxjs/operators';
import * as CryptoJS from 'crypto-js';

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
  private ipInfo: DeviceInfo['ip'] | null = null;
  private ipPromise: Promise<DeviceInfo['ip']> | null = null;
  private cityInfo: string | null = null;
  private cityPromise: Promise<string> | null = null;
  private readonly ENCRYPTION_KEY = 'your-secret-key-here';
  
  // BehaviorSubject для отслеживания состояния загрузки
  private ipLoadedSubject = new BehaviorSubject<boolean>(false);
  private cityLoadedSubject = new BehaviorSubject<boolean>(false);
  
  // Время последней загрузки для троттлинга
  private lastIPLoadTime: number = 0;
  private lastCityLoadTime: number = 0;
  
  // Минимальный интервал между запросами (30 минут)
  private readonly MIN_LOAD_INTERVAL = 30 * 60 * 1000;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  /**
   * Получить всю информацию об устройстве и пользователе
   */
  async getAllInfo(includeIP: boolean = false, includeCity: boolean = false): Promise<DeviceInfo> {
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

    // IP информация только если явно запрошено
    if (includeIP) {
      try {
        info.ip = await this.getIPInfo();
      } catch (error) {
        console.warn('IP info not available:', error);
        info.ip = { ip: 'unknown' };
      }
    }

    // Город по IP только если явно запрошено
    if (includeCity && info.ip && info.ip.ip !== 'unknown' && info.ip.ip !== 'not-loaded') {
      try {
        const city = await this.detectCityByIP();
        if (city !== 'Unknown') {
          info.ip.city = city;
        }
      } catch (error) {
        console.warn('City detection failed:', error);
      }
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
  getAllInfoObservable(includeIP: boolean = false, includeCity: boolean = false): Observable<DeviceInfo> {
    return from(this.getAllInfo(includeIP, includeCity));
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

  private async getIPInfo(): Promise<any> {
    // Если информация уже есть в кэше - возвращаем её
    if (this.ipInfo) {
      return this.ipInfo;
    }

    // Если запрос уже выполняется - возвращаем его результат
    if (this.ipPromise) {
      return this.ipPromise;
    }

    // Проверяем троттлинг (если прошло меньше MIN_LOAD_INTERVAL с последней загрузки)
    const now = Date.now();
    if (now - this.lastIPLoadTime < this.MIN_LOAD_INTERVAL && this.lastIPLoadTime > 0) {
      return { ip: 'throttled', reason: 'load_too_soon' };
    }

    if (!this.isBrowser) {
      return { ip: 'unknown' };
    }

    // Создаем промис для запроса IP
    this.ipPromise = new Promise(async (resolve, reject) => {
      try {
        this.lastIPLoadTime = Date.now();
        
        // Попробуем несколько сервисов по очереди
        const services = [
          'https://api.ipify.org?format=json',
          'https://ipapi.co/json/',
          'https://api.my-ip.io/v2/ip.json'
        ];

        for (const service of services) {
          try {
            const response: any = await this.http.get(service, { 
              headers: { 'Accept': 'application/json' }
            }).toPromise();

            let ipInfo: DeviceInfo['ip'];

            if (service.includes('ipify')) {
              ipInfo = { ip: response.ip };
            } else if (service.includes('ipapi')) {
              ipInfo = {
                ip: response.ip,
                city: response.city,
                country: response.country_name,
                isp: response.org
              };
              // Если получили город от сервиса, сохраняем его
              if (response.city && !this.cityInfo) {
                this.cityInfo = response.city;
                this.cityLoadedSubject.next(true);
              }
            } else if (service.includes('my-ip')) {
              ipInfo = { ip: response.ip };
            }

            // Сохраняем в кэш
            this.ipInfo = ipInfo;
            this.ipLoadedSubject.next(true);
            resolve(ipInfo);
            return;
          } catch (error) {
            console.debug(`IP service ${service} failed:`, error);
            continue; // Пробуем следующий сервис
          }
        }

        const unknownIp = { ip: 'unknown' };
        this.ipInfo = unknownIp;
        this.ipLoadedSubject.next(true);
        resolve(unknownIp);
      } catch (error) {
        console.error('Error getting IP info:', error);
        const unknownIp = { ip: 'unknown', error: true };
        this.ipInfo = unknownIp;
        this.ipLoadedSubject.next(true);
        resolve(unknownIp);
      } finally {
        this.ipPromise = null;
      }
    });

    return this.ipPromise;
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

  /**
   * Зашифровать данные устройства
   */
  encryptDeviceInfo(deviceInfo: DeviceInfo): string {
    const jsonString = JSON.stringify(deviceInfo);
    const encrypted = CryptoJS.AES.encrypt(
      jsonString,
      this.ENCRYPTION_KEY
    ).toString();
    return encrypted;
  }

  /**
   * Расшифровать данные устройства
   */
  decryptDeviceInfo(encryptedData: string): DeviceInfo {
    const decrypted = CryptoJS.AES.decrypt(
      encryptedData,
      this.ENCRYPTION_KEY
    );
    const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(jsonString);
  }

  /**
   * Получить и зашифровать информацию об устройстве
   */
  async getEncryptedDeviceInfo(includeIP: boolean = false, includeCity: boolean = false): Promise<string> {
    const deviceInfo = await this.getAllInfo(includeIP, includeCity);
    return this.encryptDeviceInfo(deviceInfo);
  }

  /**
   * Определить город по IP
   */
  async detectCityByIP(): Promise<string> {
    // Если город уже есть в кэше - возвращаем его
    if (this.cityInfo) {
      return this.cityInfo;
    }

    // Если запрос уже выполняется - возвращаем его результат
    if (this.cityPromise) {
      return this.cityPromise;
    }

    // Проверяем троттлинг
    const now = Date.now();
    if (now - this.lastCityLoadTime < this.MIN_LOAD_INTERVAL && this.lastCityLoadTime > 0) {
      return 'throttled';
    }

    this.cityPromise = new Promise(async (resolve, reject) => {
      try {
        this.lastCityLoadTime = Date.now();
        
        // Сначала получаем IP информацию
        const ipInfo = await this.getIPInfo();
        
        // Если IP сервис уже вернул город, используем его
        if (ipInfo && ipInfo.city) {
          this.cityInfo = ipInfo.city;
          this.cityLoadedSubject.next(true);
          resolve(ipInfo.city);
          return;
        }

        // Если нет города в IP информации, пробуем геолокацию
        if (this.isBrowser) {
          try {
            const location = await this.getLocation();
            if (location) {
              const city = await this.getCityByCoordinates(location.latitude, location.longitude);
              this.cityInfo = city;
              this.cityLoadedSubject.next(true);
              resolve(city);
              return;
            }
          } catch (geoError) {
            console.warn('Geolocation not available for city detection:', geoError);
          }
        }

        this.cityInfo = 'Unknown';
        this.cityLoadedSubject.next(true);
        resolve('Unknown');
      } catch (error) {
        console.error('Error detecting city:', error);
        this.cityInfo = 'Unknown';
        this.cityLoadedSubject.next(true);
        resolve('Unknown');
      } finally {
        this.cityPromise = null;
      }
    });

    return this.cityPromise;
  }

  /**
   * Определить город по координатам
   */
  private async getCityByCoordinates(lat: number, lng: number): Promise<string> {
    try {
      // Используем Nominatim (OpenStreetMap) для обратного геокодирования
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
      const response: any = await this.http.get(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'YourAppName/1.0'
        }
      }).toPromise();

      return response.address?.city ||
        response.address?.town ||
        response.address?.village ||
        'Unknown';
    } catch (error) {
      console.error('Error getting city by coordinates:', error);
      return 'Unknown';
    }
  }

  /**
   * Получить полную информацию с городом
   */
  async getCompleteDeviceInfo(): Promise<any> {
    const deviceInfo = await this.getAllInfo();
    // Город загружаем только если нужен
    let city = 'Unknown';
    if (this.cityInfo) {
      city = this.cityInfo;
    }
    
    return {
      ...deviceInfo,
      detectedCity: city,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Получить минимизированную информацию для заголовков
   */
  async getMinimalDeviceInfo(includeCity: boolean = false): Promise<any> {
    if (!this.isBrowser) {
      return {
        isBrowser: false,
        timestamp: new Date().toISOString()
      };
    }

    const browserInfo = this.getBrowserInfo();
    const osInfo = this.getOSInfo();
    const screenInfo = this.getScreenInfo();
    
    let city = 'Unknown';
    if (includeCity && this.cityInfo) {
      city = this.cityInfo;
    }

    return {
      browser: browserInfo.name,
      os: osInfo.name,
      screen: `${screenInfo.width}x${screenInfo.height}`,
      isMobile: browserInfo.isMobile,
      timezone: this.getTimeInfo().timezone,
      city: city,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Явный метод для получения только IP информации
   */
  async getIPInfoOnly(): Promise<DeviceInfo['ip']> {
    return this.getIPInfo();
  }

  /**
   * Получить информацию о геолокации без IP
   */
  async getLocationOnly(): Promise<DeviceInfo['location']> {
    return this.getLocation();
  }

  /**
   * Очистить кэш IP информации
   */
  clearIPCache(): void {
    this.ipInfo = null;
    this.ipPromise = null;
    this.ipLoadedSubject.next(false);
  }

  /**
   * Очистить кэш города
   */
  clearCityCache(): void {
    this.cityInfo = null;
    this.cityPromise = null;
    this.cityLoadedSubject.next(false);
  }

  /**
   * Инициализировать загрузку IP (один раз при старте приложения)
   */
  async initializeIP(force: boolean = false): Promise<void> {
    // Если уже загружено и не форсируем - ничего не делаем
    if (this.ipInfo && !force) {
      return;
    }

    try {
      await this.getIPInfo();
    } catch (error) {
      console.error('Failed to initialize IP:', error);
    }
  }

  /**
   * Инициализировать загрузку города (один раз при старте приложения)
   */
  async initializeCity(force: boolean = false): Promise<void> {
    // Если уже загружено и не форсируем - ничего не делаем
    if (this.cityInfo && !force) {
      return;
    }

    try {
      await this.detectCityByIP();
    } catch (error) {
      console.error('Failed to initialize city:', error);
    }
  }

  /**
   * Получить Observable для отслеживания загрузки IP
   */
  getIPLoadedObservable(): Observable<boolean> {
    return this.ipLoadedSubject.asObservable();
  }

  /**
   * Получить Observable для отслеживания загрузки города
   */
  getCityLoadedObservable(): Observable<boolean> {
    return this.cityLoadedSubject.asObservable();
  }

  /**
   * Проверить, загружена ли IP информация
   */
  isIPLoaded(): boolean {
    return !!this.ipInfo;
  }

  /**
   * Проверить, загружена ли информация о городе
   */
  isCityLoaded(): boolean {
    return !!this.cityInfo;
  }

  /**
   * Получить IP из кэша (без загрузки)
   */
  getCachedIP(): DeviceInfo['ip'] | null {
    return this.ipInfo;
  }

  /**
   * Получить город из кэша (без загрузки)
   */
  getCachedCity(): string | null {
    return this.cityInfo;
  }
}