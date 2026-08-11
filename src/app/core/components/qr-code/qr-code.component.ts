import { Component, Input, OnInit, OnChanges, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

export type CardVariant = 'loyalty' | 'business' | 'custom';

export interface CardStyle {
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  accentColor: string;
  gradient: string;
  icon: string;
}

@Component({
  selector: 'app-digital-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="digital-card" 
         [style.background]="computedStyle.gradient"
         [class.digital-card--placeholder]="!data"
         [class.digital-card--variant-loyalty]="cardVariant === 'loyalty'"
         [class.digital-card--variant-business]="cardVariant === 'business'">
      
      <!-- Декоративные элементы -->
      <div class="card-glow card-glow--1"></div>
      <div class="card-glow card-glow--2"></div>

      <!-- Верхняя часть -->
      <div class="card-top">
        <div class="card-brand">
          <span class="card-brand__name">{{ brandName || 'ПАКЕТОН.РФ' }}</span>
        </div>
        <div class="card-type" [style.color]="computedStyle.textColor">{{ cardTypeLabel || 'Карта' }}</div>
      </div>

      <!-- Область кода с поддержкой размытия -->
      <div class="card-code-area">
        
        <!-- QR-код (размывается отдельно) -->
        <canvas #qrCanvas 
                *ngIf="mode === 'qr' && data" 
                class="qr-canvas"
                [class.code-element-blurred]="blurCode">
        </canvas>
        
        <!-- Штрих-код (размывается отдельно) -->
        <svg #barcodeSvg 
             *ngIf="mode === 'barcode' && data" 
             class="barcode-full-width"
             [class.code-element-blurred]="blurCode">
        </svg>
        
        <!-- Плейсхолдер если нет данных -->
        <div class="placeholder-code" *ngIf="!data">
          <p [style.color]="computedStyle.textColor + '99'">{{ placeholderText || 'Нет данных' }}</p>
        </div>
        
        <!-- Оверлей "Недоступно" (всегда чёткий, поверх кода) -->
        <div class="blur-overlay" *ngIf="blurCode && data">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
          </svg>
          <span>Недоступно</span>
        </div>
        
      </div>

      <!-- Нижняя часть -->
      <div class="card-bottom">
        <div class="card-info" *ngIf="cardNumber">
          <div class="card-info__label" [style.color]="computedStyle.textColor + '99'">{{ numberLabel || 'Номер' }}</div>
          <div class="card-info__value" [style.color]="computedStyle.textColor">{{ cardNumber || '•••• •••• •••• ••••' }}</div>
        </div>
        <div class="card-info card-info--right" *ngIf="holderLabel">
          <div class="card-info__label" [style.color]="computedStyle.textColor + '99'">{{ holderLabel || 'Владелец' }}</div>
          <div class="card-info__value card-info__value--holder" [style.color]="computedStyle.textColor">
            {{ cardHolder || holderPlaceholder || 'Участник' }}
          </div>
        </div>
      </div>

      <!-- Статус (отображается, если передан) -->
      <div class="card-status" *ngIf="statusCode" [style.color]="statusColor || (computedStyle.textColor + 'cc')">
        {{ statusCode }}
      </div>

      <!-- Футер (опционально) -->
      <div class="card-footer" *ngIf="footerText" [style.color]="computedStyle.textColor + 'cc'">
        {{ footerText }}
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
    }

    .digital-card {
      border-radius: 20px;
      padding: 16px;
      position: relative;
      overflow: hidden;
      box-shadow:
        0 4px 6px rgba(0, 0, 0, 0.1),
        0 10px 30px rgba(0, 0, 0, 0.15),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      aspect-ratio: 2/1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      color: white;

      &:hover {
        transform: translateY(-4px);
        box-shadow:
          0 8px 12px rgba(0, 0, 0, 0.12),
          0 20px 40px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      &--placeholder {
        opacity: 0.7;
      }
    }

    /* Декоративные блики */
    .card-glow {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      opacity: 0.15;
    }
    .card-glow--1 {
      top: -50%;
      right: -30%;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, white 0%, transparent 70%);
    }
    .card-glow--2 {
      bottom: -20%;
      left: -20%;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, white 0%, transparent 70%);
    }

    /* Верхняя часть */
    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
      z-index: 1;
    }

    .card-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .card-brand__name {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: white;
    }

    .card-type {
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      opacity: 0.8;
    }

    /* Область кода */
    .card-code-area {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;  /* Для позиционирования оверлея */
      z-index: 1;
      padding: 7px 0;
      min-height: 70px;  /* Чтобы область не схлопывалась */

      .qr-canvas {
        display: block;
        border-radius: 8px;
        max-width: 140px;
        height: auto;
        background: white;
        padding: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: filter 0.3s ease;
      }

      .barcode-full-width {
        display: block;
        width: 100% !important;
        height: auto !important;
        max-height: 70px;
        background: white;
        border-radius: 8px;
        padding: 8px 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: filter 0.3s ease;
      }

      .placeholder-code {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        border-radius: 12px;
        padding: 16px;
        width: 100%;
        max-width: 140px;

        p {
          font-size: 12px;
          margin: 0;
          opacity: 0.6;
        }
      }

      /* 🔹 Размытие ТОЛЬКО элемента кода, а не контейнера */
      .code-element-blurred {
        filter: blur(6px);
        pointer-events: none;
        user-select: none;
        opacity: 0.5;
      }
    }

    /* 🔹 Оверлей "Недоступно" — всегда чёткий, поверх размытого кода */
    .blur-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 10px 14px;
      background: rgba(0, 0, 0, 0.75);
      border-radius: 10px;
      color: white;
      font-size: 11px;
      font-weight: 500;
      z-index: 3;  /* Выше, чем код (z-index: 1) */
      pointer-events: auto;
      border: 1px solid rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(2px);  /* Лёгкий блюр фона оверлея для красоты */
      white-space: nowrap;

      svg {
        opacity: 0.95;
        flex-shrink: 0;
      }
    }

    /* Нижняя часть */
    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      position: relative;
      z-index: 1;
      gap: 12px;
    }

    .card-info {
      display: flex;
      flex-direction: column;
      gap: 4px;

      &--right {
        text-align: right;
        align-items: flex-end;
      }
    }

    .card-info__label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    .card-info__value {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      word-break: break-all;

      &--holder {
        max-width: 120px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    /* Статус */
    .card-status {
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      padding: 6px 12px;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.1);
      letter-spacing: 0.3px;
      transition: all 0.2s ease;
    }

    /* Футер */
    .card-footer {
      font-size: 10px;
      text-align: center;
      padding-top: 8px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      margin-top: 4px;
    }

    /* Адаптивность */
    @media (max-width: 480px) {
      .digital-card {
        padding: 14px;
        border-radius: 16px;
      }

      .card-brand__name {
        font-size: 16px;
      }

      .card-code-area .qr-canvas {
        max-width: 120px;
      }

      .card-info__value {
        font-size: 12px;
      }

      .card-status {
        font-size: 10px;
        padding: 4px 10px;
      }
    }
  `]
})
export class DigitalCardComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() data: string = '';
  @Input() width: number = 140;
  @Input() mode: 'qr' | 'barcode' = 'qr';
  @Input() cardVariant: CardVariant = 'loyalty';
  
  // 🔹 Новые параметры
  @Input() blurCode: boolean = false;           // Размытие кода
  @Input() statusCode: string = '';             // Текст статуса
  @Input() statusColor?: string;                // Цвет статуса (опционально)

  // Текстовые поля (все опциональны)
  @Input() brandName: string = '';
  @Input() cardTypeLabel: string = '';
  @Input() numberLabel: string = '';
  @Input() holderLabel: string = '';
  @Input() cardNumber: string = '';
  @Input() cardHolder: string = '';
  @Input() holderPlaceholder: string = '';
  @Input() placeholderText: string = '';
  @Input() footerText: string = '';

  // Стили (опционально, переопределяют preset)
  @Input() primaryColor?: string;
  @Input() secondaryColor?: string;
  @Input() textColor?: string;
  @Input() accentColor?: string;
  @Input() gradient?: string;
  @Input() icon?: string;

  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barcodeSvg') barcodeSvg!: ElementRef<SVGElement>;

  private needsRegenerate = false;

  // Предустановленные стили для вариантов
  private readonly presets: Record<CardVariant, CardStyle> = {
    loyalty: {
      primaryColor: '#3c8a27',
      secondaryColor: '#1a4f12',
      textColor: '#ffffff',
      accentColor: '#4eb432',
      gradient: 'linear-gradient(135deg, #3c8a27 0%, #2d6c1d 60%, #1a4f12 100%)',
      icon: '🎁'
    },
    business: {
      primaryColor: '#1e3a5f',
      secondaryColor: '#0f172a',
      textColor: '#ffffff',
      accentColor: '#3b82f6',
      gradient: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 60%, #0a0f1a 100%)',
      icon: '💼'
    },
    custom: {
      primaryColor: '#666',
      secondaryColor: '#333',
      textColor: '#fff',
      accentColor: '#999',
      gradient: 'linear-gradient(135deg, #666 0%, #333 100%)',
      icon: '📇'
    }
  };

  constructor() {}

  /**
   * Вычисляем финальные стили: preset + переопределения через @Input
   */
  get computedStyle(): CardStyle {
    const preset = this.presets[this.cardVariant] || this.presets.custom;
    return {
      primaryColor: this.primaryColor ?? preset.primaryColor,
      secondaryColor: this.secondaryColor ?? preset.secondaryColor,
      textColor: this.textColor ?? preset.textColor,
      accentColor: this.accentColor ?? preset.accentColor,
      gradient: this.gradient ?? preset.gradient,
      icon: this.icon ?? preset.icon
    };
  }

  ngOnInit(): void {
    setTimeout(() => this.generate(), 0);
  }

  ngOnChanges(): void {
    this.needsRegenerate = true;
  }

  ngAfterViewChecked(): void {
    if (this.needsRegenerate) {
      this.needsRegenerate = false;
      setTimeout(() => this.generate(), 0);
    }
  }

  private generate(): void {
    if (!this.data) return;

    if (this.mode === 'qr') {
      this.generateQR();
    } else {
      this.generateBarcode();
    }
  }

  private generateQR(): void {
    if (!this.qrCanvas?.nativeElement) return;

    QRCode.toCanvas(
      this.qrCanvas.nativeElement,
      this.data,
      {
        width: this.width,
        margin: 1,
        color: {
          dark: this.computedStyle.secondaryColor,
          light: '#ffffff'
        }
      },
      (error) => {
        if (error) console.error('QR generation error:', error);
      }
    );
  }

  private generateBarcode(): void {
    if (!this.barcodeSvg?.nativeElement) return;

    const containerWidth = this.barcodeSvg.nativeElement.parentElement?.clientWidth || 300;
    const estimatedModules = this.data.length > 13 ? 120 : 95;
    const barWidth = Math.max(1, Math.floor((containerWidth - 40) / estimatedModules));

    try {
      JsBarcode(this.barcodeSvg.nativeElement, this.data, {
        format: 'EAN13',
        width: barWidth,
        height: 20,
        displayValue: false,
        margin: 4,
        background: 'transparent',
        lineColor: this.computedStyle.secondaryColor
      });
    } catch (error) {
      try {
        JsBarcode(this.barcodeSvg.nativeElement, this.data, {
          format: 'CODE128',
          width: barWidth,
          height: 20,
          displayValue: false,
          margin: 4,
          background: 'transparent',
          lineColor: this.computedStyle.secondaryColor
        });
      } catch (e) {
        console.error('Barcode generation error:', e);
      }
    }
  }
}