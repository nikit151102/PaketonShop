import { HttpClient } from '@angular/common/http';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { environment } from '../../../../environment';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-yandex-id-button',
  template: `
    <button (click)="loginWithYandex()" 
            [disabled]="isLoading"
            style="margin-top: 15px;background: #fc3f1d; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-size: 16px; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;">
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
  // @Input() clientId: string = '84c49ef7adbf47128edf60cef9b6d23d';
  @Input() clientId: string = 'b94a5e8ac2d14b009a5040f9c6102ca0';
  @Output() loginSuccess = new EventEmitter<any>();
  @Output() loginError = new EventEmitter<any>();

  isLoading = false;
  private popup: Window | null = null;
  private popupInterval: any;

  constructor(private http: HttpClient) { }

  loginWithYandex(): void {
    this.isLoading = true;

    const state = this.generateState();
    localStorage.setItem('yandex_oauth_state', state);

    const redirectUri = `https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/auth/yandex-callback`;
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

    this.popupInterval = setInterval(() => {
      if (!this.popup || this.popup.closed) {
        if (this.popupInterval) {
          clearInterval(this.popupInterval);
          this.isLoading = false;
        }
        return;
      }

      try {
        const popupUrl = this.popup.location.href;

        if (popupUrl.includes('code=')) {
          const urlParams = new URLSearchParams(popupUrl.split('?')[1]);
          const code = urlParams.get('code');
          const stateParam = urlParams.get('state');

          const savedState = localStorage.getItem('yandex_oauth_state');
          if (code && stateParam === savedState) {
            this.exchangeCodeForToken(code, urlParams);
            this.closePopup();
          } else if (urlParams.get('error')) {
            this.loginError.emit(urlParams.get('error_description') || 'Authorization failed');
            this.closePopup();
          }
        } else if (popupUrl.includes('error=')) {
          const urlParams = new URLSearchParams(popupUrl.split('?')[1]);
          this.loginError.emit(urlParams.get('error_description') || 'Authorization failed');
          this.closePopup();
        }
      } catch (e) {}
    }, 500);
  }

  private async exchangeCodeForToken(code: string,urlParams: any): Promise<void> {
    try {
      const response = await lastValueFrom(
        this.http.post<any>(`${environment.production}/project/testRequestBody`, {
          code: code,
          urlParams: urlParams,
          clientId: this.clientId,
          redirectUri: `${window.location.origin}/auth/yandex-callback`
        })
      );

      if (response && response.access_token) {
        await this.getUserInfo(response);
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      this.loginError.emit(error);
      this.isLoading = false;
      this.closePopup();
    }
  }

  private async getUserInfo(tokenData: any): Promise<void> {
    try {
      const userResponse = await lastValueFrom(
        this.http.get<any>('https://login.yandex.ru/info?format=json', {
          headers: {
            'Authorization': `OAuth ${tokenData.access_token}`
          }
        })
      );

      const serverResponse = await this.sendToYourBackend(userResponse, tokenData.access_token);

      this.loginSuccess.emit(serverResponse);
      this.isLoading = false;
    } catch (error) {
      console.error('Get user info error:', error);
      this.loginError.emit(error);
      this.isLoading = false;
      this.closePopup();
    }
  }

  private async sendToYourBackend(userData: any, accessToken: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.http.post(`${environment.production}/api/project/testRequestBody`, {
          userData: userData,
          accessToken: accessToken,
          provider: 'yandex'
        })
      );

      return response;
    } catch (error) {
      console.error('Error sending to backend:', error);
      throw error;
    }
  }

  private closePopup(): void {
    if (this.popup && !this.popup.closed) {
      this.popup.close();
    }
    if (this.popupInterval) {
      clearInterval(this.popupInterval);
      this.popupInterval = null;
    }
    this.popup = null;
  }

  private generateState(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}