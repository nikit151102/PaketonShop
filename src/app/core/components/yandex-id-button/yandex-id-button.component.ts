import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-yandex-id-button',
  template: `
    <button (click)="loginWithYandex()" 
            [disabled]="isLoading"
            style="background: #fc3f1d; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        <path d="M13 7h-2v5H8v2h3v5h2v-5h3v-2h-3z"/>
      </svg>
      {{ isLoading ? 'Загрузка...' : 'Войти через Яндекс' }}
    </button>
  `,
  styles: [':host { display: block; } button:disabled { opacity: 0.6; cursor: not-allowed; }']
})
export class YandexIdButtonComponent {
  @Input() clientId: string = '84c49ef7adbf47128edf60cef9b6d23d';
  @Output() loginSuccess = new EventEmitter<any>();
  @Output() loginError = new EventEmitter<any>();
  
  isLoading = false;
  private popup: Window | null = null;
  private popupInterval: any;

  loginWithYandex(): void {
    this.isLoading = true;
    
    // Создаем уникальный state для защиты от CSRF
    const state = this.generateState();
    localStorage.setItem('yandex_oauth_state', state);
    
    // URL авторизации
    const redirectUri = `${window.location.origin}/oauth-callback`;
    const yandexAuthUrl = `https://oauth.yandex.ru/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    
    // Открываем popup
    const width = 600;
    const height = 700;
    const left = (window.screen.width - width) / 2;
    const top = (window.screen.height - height) / 2;
    
    this.popup = window.open(
      yandexAuthUrl,
      'yandex-auth',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    );
    
    // Слушаем сообщения из popup
    window.addEventListener('message', this.handlePopupMessage.bind(this));
    
    // Проверяем, не закрыл ли пользователь popup
    this.popupInterval = setInterval(() => {
      if (this.popup && this.popup.closed) {
        clearInterval(this.popupInterval);
        this.isLoading = false;
        window.removeEventListener('message', this.handlePopupMessage.bind(this));
      }
    }, 500);
  }
  
  private handlePopupMessage(event: MessageEvent): void {
    // Проверяем происхождение сообщения
    if (event.origin !== window.location.origin) return;
    
    if (event.data.type === 'yandex_auth_success') {
      // Авторизация успешна, получаем код
      this.exchangeCodeForToken(event.data.code);
    } else if (event.data.type === 'yandex_auth_error') {
      this.loginError.emit(event.data.error);
      this.isLoading = false;
      this.closePopup();
    }
  }
  
  private exchangeCodeForToken(code: string): void {
    // Отправляем код на ваш бэкенд для обмена на токен
    fetch('/api/yandex/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, clientId: this.clientId })
    })
    .then(response => response.json())
    .then(data => {
      if (data.access_token) {
        this.getUserInfo(data.access_token);
      } else {
        throw new Error('Failed to get access token');
      }
    })
    .catch(error => {
      this.loginError.emit(error);
      this.isLoading = false;
      this.closePopup();
    });
  }
  
  private getUserInfo(accessToken: string): void {
    // Получаем данные пользователя
    fetch('https://login.yandex.ru/info?format=json', {
      headers: {
        'Authorization': `OAuth ${accessToken}`
      }
    })
    .then(response => response.json())
    .then(userData => {
      this.loginSuccess.emit(userData);
      this.isLoading = false;
      this.closePopup();
    })
    .catch(error => {
      this.loginError.emit(error);
      this.isLoading = false;
      this.closePopup();
    });
  }
  
  private closePopup(): void {
    if (this.popup && !this.popup.closed) {
      this.popup.close();
    }
    clearInterval(this.popupInterval);
    window.removeEventListener('message', this.handlePopupMessage.bind(this));
  }
  
  private generateState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}