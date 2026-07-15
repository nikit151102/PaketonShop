import { Component, Input, OnInit, OnChanges, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-qr-code',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="loyalty-card" *ngIf="data">
      <!-- Верхняя часть карты -->
      <div class="card-top">
        <div class="card-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <div class="card-type">Карта лояльности</div>
      </div>

      <!-- Код -->
      <div class="card-code-area">
        <canvas #qrCanvas *ngIf="mode === 'qr'" class="qr-canvas"></canvas>
        <svg #barcodeSvg *ngIf="mode === 'barcode'" class="barcode-full-width"></svg>
      </div>

      <!-- Нижняя часть карты -->
      <div class="card-bottom">
        <!-- <div class="card-number">{{ cardNumber }}</div>
        <div class="card-holder">{{ cardHolder || 'Участник программы' }}</div> -->
        <div class="card-holder">Участник программы</div>
      </div>
    </div>

    <!-- Placeholder -->
    <div class="loyalty-card loyalty-card--placeholder" *ngIf="!data">
      <div class="card-top">
        <div class="card-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
          <span>ПАКЕТОН</span>
        </div>
        <div class="card-type">Карта лояльности</div>
      </div>
      <div class="card-code-area placeholder-area">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M7 7h10M7 12h10M7 17h6"/>
        </svg>
        <p>Нет данных для кода</p>
      </div>
      <div class="card-bottom">
        <!-- <div class="card-number">•••• •••• •••• ••••</div> -->
        <div class="card-holder">Участник программы</div>
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

    /* === PLASTIC CARD === */
    .loyalty-card {
      background: linear-gradient(135deg, #3c8a27 0%, #2d6c1d 60%, #1a4f12 100%);
      border-radius: 20px;
      padding: 16px;
      position: relative;
      overflow: hidden;
      box-shadow:
        0 4px 6px rgba(0, 0, 0, 0.1),
        0 10px 30px rgba(60, 138, 39, 0.25),
        inset 0 1px 0 rgba(255, 255, 255, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      aspect-ratio:  1.86/1; 
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      &:hover {
        transform: translateY(-4px);
        box-shadow:
          0 8px 12px rgba(0, 0, 0, 0.12),
          0 20px 40px rgba(60, 138, 39, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.2);
      }

      &--placeholder {
        opacity: 0.7;
      }
    }

    /* Декоративный блик на пластике */
    .loyalty-card::before {
      content: '';
      position: absolute;
      top: -50%;
      right: -30%;
      width: 200px;
      height: 200px;
      background: radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%);
      pointer-events: none;
    }

    .loyalty-card::after {
      content: '';
      position: absolute;
      bottom: -20%;
      left: -20%;
      width: 150px;
      height: 150px;
      background: radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%);
      pointer-events: none;
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
      color: white;

      svg {
        width: 28px;
        height: 28px;
        opacity: 0.9;
      }

      span {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: 1px;
        text-transform: uppercase;
      }
    }

    .card-type {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }

    /* Область кода */
    .card-code-area {
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      z-index: 1;
      padding: 12px 0;

      .qr-canvas {
        display: block;
        border-radius: 8px;
        max-width: 140px;
        height: auto;
        background: white;
        padding: 6px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
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
      }

      &.placeholder-area {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border: 2px dashed rgba(255, 255, 255, 0.2);
        border-radius: 12px;

        svg {
          opacity: 0.4;
          color: white;
        }

        p {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          margin: 0;
        }
      }
    }

    /* Нижняя часть */
    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      position: relative;
      z-index: 1;
    }

    .card-number {
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: 700;
      color: white;
      letter-spacing: 2px;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
    }

    .card-holder {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.6);
      text-transform: uppercase;
      letter-spacing: 1px;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Адаптивность */
    @media (max-width: 480px) {
      .loyalty-card {
        padding: 18px;
        border-radius: 16px;
      }

      .card-brand span {
        font-size: 17px;
      }

      .card-code-area .qr-canvas {
        max-width: 120px;
      }

      .card-number {
        font-size: 14px;
        letter-spacing: 1.5px;
      }

      .card-holder {
        font-size: 10px;
        max-width: 100px;
      }
    }
  `]
})
export class QrCodeComponent implements OnInit, OnChanges, AfterViewChecked {
  @Input() data: string = '';
  @Input() width: number = 140;
  @Input() mode: 'qr' | 'barcode' = 'qr';
  @Input() cardNumber: string = '';
  @Input() cardHolder: string = '';

  @ViewChild('qrCanvas') qrCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barcodeSvg') barcodeSvg!: ElementRef<SVGElement>;

  private needsRegenerate = false;

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
          dark: '#1a4f12',
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
        background: 'transparent'
      });
    } catch (error) {
      try {
        JsBarcode(this.barcodeSvg.nativeElement, this.data, {
          format: 'CODE128',
          width: barWidth,
          height: 20,
          displayValue: false,
          margin: 4,
          background: 'transparent'
        });
      } catch (e) {
        console.error('Barcode generation failed:', e);
      }
    }
  }
}