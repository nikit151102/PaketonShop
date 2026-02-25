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

  @Output() onSuccess = new EventEmitter<any>();
  @Output() onFail = new EventEmitter<any>();
  @Output() onError = new EventEmitter<any>();
  @Output() onWidgetLoaded = new EventEmitter<void>();

  isWidgetVisible: boolean = false;
  private checkout: any = null;

  ngOnInit(): void {
    if (this.autoRender && this.confirmationToken) {
      this.renderWidget();
    }
  }

  ngOnDestroy(): void {
    this.destroyWidget();
  }

  /**
   * Рендерит платежный виджет
   */
  renderWidget(): void {
    if (!this.checkYooMoneyScript()) {
      this.onError.emit('Скрипт виджета оплаты не подключен.');
      return;
    }

    this.isWidgetVisible = true;

    // Небольшая задержка для гарантии загрузки DOM
    setTimeout(() => {
      this.initializeWidget();
    }, 100);
  }

  /**
   * Закрывает и уничтожает виджет
   */
  destroyWidget(): void {
    if (this.checkout) {
      try {
        this.checkout.destroy();
      } catch (e) {
        console.error('Ошибка при уничтожении виджета:', e);
      }
      this.checkout = null;
    }
    this.isWidgetVisible = false;
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
        }
      });

      this.checkout.render()
        .then(() => {
          console.log('Платежная форма успешно загружена');
          this.onWidgetLoaded.emit();

          this.checkout.on('success', () => {
            console.log('Оплата прошла успешно');
            this.onSuccess.emit(this.confirmationToken);
          });

          this.checkout.on('fail', () => {
            console.log('Оплата не удалась');
            this.onFail.emit(this.confirmationToken);
          });
        })
        .catch((error: any) => {
          console.error('Ошибка отображения платежной формы:', error);
          this.onError.emit(error);
          this.isWidgetVisible = false;
        });
    } catch (error) {
      console.error('Критическая ошибка при создании виджета:', error);
      this.onError.emit(error);
      this.isWidgetVisible = false;
    }
  }
}