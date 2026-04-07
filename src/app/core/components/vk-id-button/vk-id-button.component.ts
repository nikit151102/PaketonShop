import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, ElementRef, ViewChild, Input, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environment';
import { lastValueFrom } from 'rxjs';

declare global {
  interface Window {
    VKIDSDK: any;
  }
}

@Component({
  selector: 'app-vk-id-widget',
  imports: [CommonModule],
  template: `
    <div #vkWidgetContainer></div>
  `,
  styles: [`
    :host { display: block; }
    .user-info { font-family: monospace; }
  `]
})
export class VkIdWidgetComponent implements OnInit, AfterViewInit {
  @ViewChild('vkWidgetContainer', { static: true }) containerRef!: ElementRef;
  @Input() appId: number = 54490835;
  @Input() redirectUrl: string = window.location.origin;
  
  userData: any = null;
  private isWidgetInitialized = false;
  isLoading = false;

  constructor(
    private router: Router, 
    private ngZone: NgZone,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.checkUrlForCode();
  }

  private checkUrlForCode(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    
    if (code && state) {
      console.log('🔑 Найден code в URL:', code);
      // Очищаем URL от параметров
      window.history.replaceState({}, document.title, window.location.pathname);
      // Отправляем код на бекенд
      this.exchangeCodeForToken(code);
    }
  }

  private loadUserData(): void {
    const savedData = localStorage.getItem('vk_user_data');
    if (savedData) {
      this.userData = JSON.parse(savedData);
      console.log('📦 Загружены данные из localStorage:', this.userData);
    }
  }

  private saveUserData(data: any): void {
    this.userData = data;
    localStorage.setItem('vk_user_data', JSON.stringify(data));
    console.log('💾 Сохранены данные пользователя:', data);
  }

  ngAfterViewInit(): void {
    this.waitForSdk();
  }

  private waitForSdk(): void {
    const checkInterval = setInterval(() => {
      if (window.VKIDSDK) {
        clearInterval(checkInterval);
        this.initVkWidget();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(checkInterval);
      if (!window.VKIDSDK) {
        console.error('❌ VK SDK не загрузился');
      }
    }, 5000);
  }

  private initVkWidget(): void {
    if (this.isWidgetInitialized || !window.VKIDSDK || !this.containerRef?.nativeElement) {
      return;
    }

    try {
      const VKID = window.VKIDSDK;
      
      console.log('🚀 VKID SDK загружен, инициализация...');
      
      this.containerRef.nativeElement.innerHTML = '';

      const widgetContainer = document.createElement('div');
      widgetContainer.id = 'vkid-one-tap-container';
      this.containerRef.nativeElement.appendChild(widgetContainer);

      // Инициализация конфигурации - используем редирект режим
      VKID.Config.init({
        app: this.appId,
        redirectUrl: this.redirectUrl, // После авторизации редирект сюда же с code в URL
        responseMode: VKID.ConfigResponseMode.Redirect, // Меняем на Redirect режим
        source: VKID.ConfigSource.LOWCODE,
        scope: 'email phone',
        state: this.generateState()
      });

      const oneTap = new VKID.OneTap();

      oneTap.render({
        container: widgetContainer,
        // showAlternativeLogin: true,
        oauthList: ['vkid', 'ok_ru', 'mail_ru'],
        styles: {
          borderRadius: 16,
          height: 48
        }
      });

      // Обработка успешной авторизации (для Redirect режима)
      oneTap.on(VKID.WidgetEvents.LOGIN_SUCCESS, (payload: any) => {
        console.log('🎉 LOGIN_SUCCESS:', payload);
        this.ngZone.run(() => {
          // В Redirect режиме payload может содержать code
          if (payload.code) {
            this.exchangeCodeForToken(payload.code);
          }
        });
      });

      oneTap.on(VKID.WidgetEvents.ERROR, (error: any) => {
        console.error('❌ Ошибка VK виджета:', error);
      });

      this.isWidgetInitialized = true;
      console.log('✅ VK виджет инициализирован в Redirect режиме');
      console.log('📋 Redirect URL:', this.redirectUrl);
      
    } catch (error) {
      console.error('❌ Ошибка инициализации VK виджета:', error);
    }
  }

  private async exchangeCodeForToken(code: string): Promise<void> {
    console.log('🔄 Обмен code на токен через бекенд...');
    console.log('📝 Code:', code);
    this.isLoading = true;
    
    try {
      const apiUrl = `${environment.production}/api/project/testRequestBody`;
      console.log('📡 URL запроса:', apiUrl);
      
      const requestData = {
        provider: 'vk',
        code: code,
        redirectUrl: this.redirectUrl,
        appId: this.appId
      };
      console.log('📤 Данные запроса:', requestData);
      
      const response = await lastValueFrom(
        this.http.post<any>(apiUrl, requestData)
      );
      
      console.log('✅ Ответ от бекенда:', response);
      
      if (response) {
        this.saveUserData(response);
        this.isLoading = false;
        
        // Можно сделать редирект или показать уведомление
        // this.router.navigate(['/profile']);
      }
      
    } catch (error: any) {
      console.error('❌ Ошибка при обмене code на токен:', error);
      if (error.status === 404) {
        console.error('❌ Эндпоинт не найден! Проверьте URL:', `${environment.production}/api/project/testRequestBody`);
      }
      if (error.status === 401) {
        console.error('❌ Ошибка авторизации');
      }
      this.isLoading = false;
    }
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}