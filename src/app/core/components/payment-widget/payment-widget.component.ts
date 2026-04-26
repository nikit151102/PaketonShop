import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-payment-widget',
  imports: [CommonModule],
  templateUrl: './payment-widget.component.html',
  styleUrl: './payment-widget.component.scss'
})
export class PaymentWidgetComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() confirmationToken!: string;
  @Input() userId?: string | null;
  @Input() autoRender: boolean = true;
  @Input() amount?: number; 

  @Output() onSuccess = new EventEmitter<any>();
  @Output() onFail = new EventEmitter<any>();
  @Output() onError = new EventEmitter<any>();
  @Output() onWidgetLoaded = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>(); 

  @ViewChild('widgetContainer', { static: false }) widgetContainer!: ElementRef;

  isWidgetVisible: boolean = false;
  showLoader: boolean = false;
  private checkout: any = null;
  private autoCloseTimer: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Не рендерим сразу
  }

  ngAfterViewInit(): void {
    // Ждем, когда будет вызван openWidget извне
  }

  ngOnDestroy(): void {
    this.clearAutoCloseTimer();
    this.destroyWidget();
  }

  /**
   * Открывает виджет оплаты (вызывается из родительского компонента)
   */
  openWidget(): void {
    if (!this.confirmationToken) {
      this.onError.emit('Отсутствует токен подтверждения');
      return;
    }

    // Показываем контейнер
    this.isWidgetVisible = true;
    this.showLoader = true;
    this.cdr.detectChanges();
    
    // Ждем рендеринга DOM и пробуем инициализировать виджет
    setTimeout(() => {
      this.initializeWidget();
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
   * Проверяет подключение скрипта ЮMoney
   */
  private checkYooMoneyScript(): boolean {
    return typeof (window as any).YooMoneyCheckoutWidget !== 'undefined';
  }

  /**
   * Инициализирует виджет
   */
  private initializeWidget(): void {
    // Ждем появления контейнера в DOM
    let attempts = 0;
    const maxAttempts = 10;
    
    const tryInitialize = () => {
      // Пытаемся найти контейнер разными способами
      let container = this.widgetContainer?.nativeElement;
      
      if (!container) {
        // Пробуем найти по ID
        container = document.getElementById('payment-widget-container');
      }
      
      if (!container && attempts < maxAttempts) {
        attempts++;
        console.log(`Ждем контейнер виджета, попытка ${attempts}...`);
        setTimeout(tryInitialize, 100);
        return;
      }
      
      if (!container) {
        console.error('Контейнер для виджета не найден после всех попыток');
        this.onError.emit('Контейнер для виджета не найден');
        this.showLoader = false;
        return;
      }
      
      if (!this.checkYooMoneyScript()) {
        console.error('Скрипт ЮMoney не загружен');
        this.onError.emit('Скрипт виджета оплаты не подключен');
        this.showLoader = false;
        return;
      }
      
      this.renderWidget(container);
    };
    
    tryInitialize();
  }

  /**
   * Рендерит виджет
   */
  private renderWidget(container: HTMLElement): void {
    try {
      const YooMoneyCheckoutWidget = (window as any).YooMoneyCheckoutWidget;
      
      // Убеждаемся, что элемент имеет ID
      if (!container.id) {
        container.id = 'payment-widget-container';
      }
      
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

      this.checkout.render(container.id)
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
        });
    } catch (error) {
      console.error('Критическая ошибка при создании виджета:', error);
      this.onError.emit(error);
      this.showLoader = false;
    }
  }

  /**
   * Закрывает и уничтожает виджет
   */
  private destroyWidget(): void {
    if (this.checkout) {
      try {
        if (typeof this.checkout.destroy === 'function') {
          this.checkout.destroy();
        }
      } catch (e) {
        console.error('Ошибка при уничтожении виджета:', e);
      }
      this.checkout = null;
    }
    this.isWidgetVisible = false;
    this.showLoader = false;
  }
}