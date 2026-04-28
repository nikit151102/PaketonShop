import { Component, OnInit, HostListener, computed, inject, ViewChild } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserApiService } from '../../../../core/api/user.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { UserService } from '../../../../core/services/user.service';
import { TitleComponent } from '../../../../core/components/title/title.component';
import { environment, localStorageEnvironment, sessionStorageEnvironment } from '../../../../../environment';
import { BasketsStateService } from '../../../../core/services/baskets-state.service';
import { PaymentService } from '../../../../core/api/payment.service';
import { PaymentWidgetComponent } from '../../../../core/components/payment-widget/payment-widget.component';
import { finalize, Subject, takeUntil } from 'rxjs';
import { TopupModalComponent } from '../../../../core/components/topup-modal/topup-modal.component';

@Component({
  selector: 'app-profile',
  imports: [RouterModule, CommonModule, FormsModule, PaymentWidgetComponent, TopupModalComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  animations: [
    trigger('staggerAnimation', [
      transition(':enter', [
        query('.profile-menu-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
              style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ])
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-20px)' }),
        animate('400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in',
          style({ opacity: 0, transform: 'translateY(-20px)' }))
      ])
    ])
  ]
})
export class ProfileComponent implements OnInit {

  @ViewChild(PaymentWidgetComponent) paymentWidgetComponent!: PaymentWidgetComponent;

  user: any = null;
  favoriteCount: number = 0;
  addressCount: number = 0;
  unreadOrdersCount: number = 2;
  unreadAnswersCount: number = 1;
  isLoading: boolean = true;
  isMobile: boolean = false;
  operativeInfo = computed(() => this.userService.operativeInfo())

  // Пополнение баланса
  showTopupModal: boolean = false;

  // Платеж
  showPaymentWidget: boolean = false;
  paymentToken: string | null = null;
  topupAmount: number = 0;
  isProcessingTopup: boolean = false;

  private destroy$ = new Subject<void>();

  private userService = inject(UserService);
  private userApiService = inject(UserApiService);
  private router = inject(Router);
  private basketsStateService = inject(BasketsStateService);
  private paymentService = inject(PaymentService);

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadUserData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  loadUserData(): void {
    this.isLoading = true;
    this.userApiService.getData().subscribe({
      next: (response) => {
        this.user = response.data;
        console.log('response.data',response.data)
        this.isLoading = false;
        this.userApiService.getOperativeInfo();
        this.simulateAdditionalData();
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this.isLoading = false;
      }
    });
  }

  private simulateAdditionalData(): void {
    setTimeout(() => {
      this.favoriteCount = Math.floor(Math.random() * 50);
      this.addressCount = Math.floor(Math.random() * 5) + 1;
    }, 300);
  }

  editAvatar(): void {
    console.log('Edit avatar');
  }

  getUserInitials(): string {
    if (!this.user) return '';
    const first = this.user.firstName?.charAt(0) || '';
    const last = this.user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'П';
  }

  logout(): void {
    localStorage.removeItem(environment.localStorageKeys.auth);
    localStorage.removeItem(localStorageEnvironment.auth.key);
    localStorage.removeItem(localStorageEnvironment.user.key);
    sessionStorage.removeItem(sessionStorageEnvironment.auth.key);
    sessionStorage.removeItem(sessionStorageEnvironment.user.key);
    this.basketsStateService.clearBaskets();
    this.router.navigate(['']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  // Проверка заполненности профиля
  isProfileIncomplete(): boolean {
    if (!this.user) return false;
    
    const missingFields = [];
    
    if (!this.user.email || this.user.email === 'Email не указан') {
      missingFields.push('email');
    }
    if (!this.user.phoneNumber || this.user.phoneNumber === 'Телефон не указан') {
      missingFields.push('телефон');
    }
    if (!this.user.firstName || this.user.firstName.trim() === '') {
      missingFields.push('имя');
    }
    if (!this.user.lastName || this.user.lastName.trim() === '') {
      missingFields.push('фамилию');
    }
    
    return missingFields.length > 0;
  }

  getMissingFieldsList(): string[] {
    if (!this.user) return [];
    
    const missing = [];
    
    if (!this.user.email || this.user.email === 'Email не указан') {
      missing.push('email');
    }
    if (!this.user.phoneNumber || this.user.phoneNumber === 'Телефон не указан') {
      missing.push('телефон');
    }
    if (!this.user.firstName || this.user.firstName.trim() === '') {
      missing.push('имя');
    }
    if (!this.user.lastName || this.user.lastName.trim() === '') {
      missing.push('фамилию');
    }
    
    return missing;
  }

  // Методы для пополнения баланса
  openTopUpModal(): void {
    this.showTopupModal = true;
  }

  closeTopupModal(): void {
    this.showTopupModal = false;
  }

  handleTopup(amount: number): void {
    this.topupAmount = amount;
    this.isProcessingTopup = true;

    // Создаем транзакцию для пополнения баланса
    this.paymentService.createTopUpTransaction(amount).pipe(
      takeUntil(this.destroy$),
      finalize(() => {
        this.isProcessingTopup = false;
      })
    ).subscribe({
      next: (response: any) => {
        if (response.data && response.data.confirmationToken) {
          this.paymentToken = response.data.confirmationToken;
          this.showPaymentWidget = true;
          setTimeout(() => {
            if (this.paymentWidgetComponent) {
              this.paymentWidgetComponent.openWidget();
            }
          }, 100);
          this.closeTopupModal();
        } else {
          console.error('Не получен confirmationToken');
          this.handlePaymentError('Не удалось получить токен оплаты');
        }
      },
      error: (error) => {
        console.error('Ошибка при создании платежа:', error);
        this.handlePaymentError(error);
      }
    });
  }

  // Методы для обработки платежа
  handlePaymentSuccess(event: any): void {
    console.log('Платеж успешен:', event);

    this.isProcessingTopup = true;
    const token = event.token || event;

    this.showPaymentWidget = false;
    this.paymentToken = null;
    this.userApiService.getOperativeInfo();
    this.showSuccessNotification('Баланс успешно пополнен!');
  }

  handlePaymentFail(event: any): void {
    console.log('Платеж не удался:', event);
    this.showPaymentWidget = false;
    this.paymentToken = null;
    this.showErrorNotification('Оплата не удалась. Попробуйте снова.');
  }

  handlePaymentError(error: any): void {
    console.error('Ошибка платежа:', error);
    this.showPaymentWidget = false;
    this.paymentToken = null;
    this.showErrorNotification('Произошла ошибка при оплате');
  }

  handleWidgetClose(): void {
    console.log('Виджет закрыт');
    this.showPaymentWidget = false;
    this.paymentToken = null;
  }

  private showSuccessNotification(message: string): void {
    // Можно добавить более красивую нотификацию позже
    console.log(message);
  }

  private showErrorNotification(message: string): void {
    // Можно добавить более красивую нотификацию позже
    console.error(message);
  }

  goToTransactionHistory(): void {
    this.router.navigate(['/profile/transactions']);
  }
}