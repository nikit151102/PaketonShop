import { CommonModule } from '@angular/common';
import { Component, AfterViewInit, ElementRef, ViewChild, Input, OnInit, NgZone } from '@angular/core';
import { Router } from '@angular/router';

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
    
    <!-- Блок для отображения данных пользователя -->
    <div *ngIf="userData" class="user-info" style="margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #f9f9f9;">
      <h3>Данные пользователя:</h3>
      <pre style="background: #eee; padding: 10px; border-radius: 4px; overflow: auto;">{{ userData | json }}</pre>
    </div>
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

  constructor(private router: Router, private ngZone: NgZone) {}

  ngOnInit() {
    // Загружаем сохраненные данные
    this.loadUserData();
    
    // Слушаем сообщения из iframe/popup
    window.addEventListener('message', this.handleMessage.bind(this));
  }

  ngOnDestroy() {
    window.removeEventListener('message', this.handleMessage.bind(this));
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

  private handleMessage(event: MessageEvent): void {
    // Проверяем, что сообщение пришло от VK
    if (event.data && event.data.type === 'VKID_AUTH_SUCCESS') {
      this.ngZone.run(() => {
        console.log('✅ Получены данные авторизации:', event.data.payload);
        this.saveUserData(event.data.payload);
      });
    }
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
      
      // Очищаем контейнер
      this.containerRef.nativeElement.innerHTML = '';

      const widgetContainer = document.createElement('div');
      widgetContainer.id = 'vkid-one-tap-container';
      this.containerRef.nativeElement.appendChild(widgetContainer);

      // Используем Callback режим для получения данных без редиректа
      VKID.Config.init({
        app: this.appId,
        redirectUrl: this.redirectUrl,
        responseMode: VKID.ConfigResponseMode.Callback, // Важно: Callback режим
        source: VKID.ConfigSource.LOWCODE,
        scope: 'email phone',
        state: this.generateState() // Добавляем state для безопасности
      });

      const oneTap = new VKID.OneTap();

      oneTap.render({
        container: widgetContainer,
        showAlternativeLogin: true,
        oauthList: ['ok_ru', 'mail_ru'],
        styles: {
          borderRadius: 16,
          height: 48
        }
      });

      // Обработка успешной авторизации (для Callback режима)
      oneTap.on(VKID.WidgetEvents.LOGIN_SUCCESS, (payload: any) => {
        console.log('🎉 Успешная авторизация VK ID!');
        console.log('📊 Полученные данные:', payload);
        
        // Получаем токен доступа
        const accessToken = payload.access_token;
        
        if (accessToken) {
          // Запрашиваем данные пользователя через API VK
          this.getVKUserInfo(accessToken);
        } else {
          console.log('Данные из payload:', payload);
          this.saveUserData(payload);
        }
      });

      oneTap.on(VKID.WidgetEvents.ERROR, (error: any) => {
        console.error('❌ Ошибка VK виджета:', error);
      });

      // Обработка токена (если пришел сразу)
      oneTap.on(VKID.WidgetEvents.TOKEN_RECEIVED, (tokenData: any) => {
        console.log('🔑 Получен токен:', tokenData);
        this.getVKUserInfo(tokenData.access_token);
      });

      this.isWidgetInitialized = true;
      console.log('✅ VK виджет инициализирован в Callback режиме');
      
    } catch (error) {
      console.error('❌ Ошибка инициализации VK виджета:', error);
    }
  }

  private getVKUserInfo(accessToken: string): void {
    console.log('🔄 Запрашиваем данные пользователя через API VK...');
    
    // Запрашиваем данные пользователя через VK API
    fetch(`https://api.vk.com/method/users.get?access_token=${accessToken}&v=5.131&fields=email,phone,photo_50,photo_100`)
      .then(response => response.json())
      .then(data => {
        if (data.response && data.response[0]) {
          const userInfo = data.response[0];
          console.log('👤 Данные пользователя из VK API:', userInfo);
          
          const fullUserData = {
            id: userInfo.id,
            first_name: userInfo.first_name,
            last_name: userInfo.last_name,
            email: userInfo.email || null,
            phone: userInfo.phone || null,
            photo: userInfo.photo_100 || userInfo.photo_50,
            access_token: accessToken
          };
          
          console.log('✅ Полные данные пользователя:', fullUserData);
          this.saveUserData(fullUserData);
        } else {
          console.warn('⚠️ Не удалось получить данные пользователя:', data);
        }
      })
      .catch(error => {
        console.error('❌ Ошибка при запросе данных VK API:', error);
      });
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}