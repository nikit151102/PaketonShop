import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-payment-widget',
  imports: [CommonModule],
  templateUrl: './payment-widget.component.html',
  styleUrl: './payment-widget.component.scss'
})
export class PaymentWidgetComponent implements OnInit, OnDestroy {
  @Input() confirmationToken!: string;
  @Input() userId?: string | null;
  @Input() autoRender: boolean = true;
  @Input() amount?: number; 

  @Output() onSuccess = new EventEmitter<any>();
  @Output() onFail = new EventEmitter<any>();
  @Output() onError = new EventEmitter<any>();
  @Output() onWidgetLoaded = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>(); 

  isWidgetVisible: boolean = false;
  showLoader: boolean = false;
  private checkout: any = null;
  private autoCloseTimer: any = null;

  ngOnInit(): void {
    if (this.autoRender && this.confirmationToken) {
      this.openWidget();
    }
  }

  ngOnDestroy(): void {
    this.clearAutoCloseTimer();
    this.destroyWidget();
  }

  /**
   * Открывает виджет оплаты
   */
  openWidget(): void {
    if (!this.confirmationToken) {
      this.onError.emit('Отсутствует токен подтверждения');
      return;
    }

    this.isWidgetVisible = true;
    this.showLoader = true;
    
    // Небольшая задержка для гарантии загрузки DOM
    setTimeout(() => {
      this.renderWidget();
    }, 100);
  }

  /**
   * Закрывает виджет
   */
  closeWidget(): void {
    this.clearAutoCloseTimer();
    this.destroyWidget();
    this.onClose.emit();
  }

  /**
   * Очищает таймер автоматического закрытия
   */
  private clearAutoCloseTimer(): void {
    if (this.autoCloseTimer) {
      clearTimeout(this.autoCloseTimer);
      this.autoCloseTimer = null;
    }
  }

  /**
   * Рендерит платежный виджет
   */
  private renderWidget(): void {
    if (!this.checkYooMoneyScript()) {
      this.onError.emit('Скрипт виджета оплаты не подключен.');
      this.showLoader = false;
      return;
    }

    this.initializeWidget();
  }

  /**
   * Закрывает и уничтожает виджет
   */
  private destroyWidget(): void {
    if (this.checkout) {
      try {
        this.checkout.destroy();
      } catch (e) {
        console.error('Ошибка при уничтожении виджета:', e);
      }
      this.checkout = null;
    }
    this.isWidgetVisible = false;
    this.showLoader = false;
  }

  /**
   * Проверяет подключение скрипта ЮMoney
   */
  private checkYooMoneyScript(): boolean {
    return typeof (window as any).YooMoneyCheckoutWidget !== 'undefined';
  }

  /**
   * Инициализирует виджет
   */
  private initializeWidget(): void {
    try {
      const YooMoneyCheckoutWidget = (window as any).YooMoneyCheckoutWidget;

      this.checkout = new YooMoneyCheckoutWidget({
        confirmation_token: this.confirmationToken,
        customization: {
          modal: true,
        },
        error_callback: (error: any) => {
          console.error('Ошибка инициализации виджета оплаты:', error);
          this.onError.emit(error);
          this.showLoader = false;
        }
      });

      this.checkout.render('payment-widget')
        .then(() => {
          console.log('Платежная форма успешно загружена');
          this.showLoader = false;
          this.onWidgetLoaded.emit();

          this.checkout.on('success', () => {
            console.log('Оплата прошла успешно');
            this.onSuccess.emit({
              token: this.confirmationToken,
              amount: this.amount
            });
            
            this.autoCloseTimer = setTimeout(() => {
              this.closeWidget();
            }, 3000);
          });

          this.checkout.on('fail', () => {
            console.log('Оплата не удалась');
            this.onFail.emit({
              token: this.confirmationToken,
              amount: this.amount
            });
          });

        })
        .catch((error: any) => {
          console.error('Ошибка отображения платежной формы:', error);
          this.onError.emit(error);
          this.showLoader = false;
          this.isWidgetVisible = false;
        });
    } catch (error) {
      console.error('Критическая ошибка при создании виджета:', error);
      this.onError.emit(error);
      this.showLoader = false;
      this.isWidgetVisible = false;
    }
  }
}