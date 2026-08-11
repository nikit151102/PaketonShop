import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CookieConsentService } from './cookie-consent.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.scss']
})
export class CookieConsentComponent implements OnInit {
  private cookieService = inject(CookieConsentService);
  private router = inject(Router);
  
  // Состояние компонента
  isVisible = signal(false);
  isAnimating = signal(false);

  ngOnInit(): void {
    // Показываем баннер с небольшой задержкой для плавности
    if (this.cookieService.shouldShowBanner()) {
      setTimeout(() => {
        this.isVisible.set(true);
        // Триггер анимации появления
        requestAnimationFrame(() => this.isAnimating.set(true));
      }, 500);
    }
  }

  /**
   * Пользователь нажал "Принять"
   */
  onAccept(): void {
    this.animateOut();
    this.cookieService.accept();
  }

  /**
   * Пользователь нажал "Отклонить"
   */
  onDecline(): void {
    this.animateOut();
    this.cookieService.decline();
  }

  /**
   * Анимация скрытия баннера
   */
  private animateOut(): void {
    this.isAnimating.set(false);
    setTimeout(() => {
      this.isVisible.set(false);
    }, 300); 
  }

  /**
   * Переход на страницу документа
   */
  goToPage(page: string) {
    this.router.navigate([page]);
  }
}