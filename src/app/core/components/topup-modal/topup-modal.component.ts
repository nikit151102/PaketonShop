import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-topup-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ],
  templateUrl: './topup-modal.component.html',
  styleUrls: ['./topup-modal.component.scss']
})
export class TopupModalComponent {
  @Input() isOpen: boolean = false;
  @Input() currentBalance: number = 0;
  @Input() minAmount: number = 100;
  @Input() maxAmount: number = 100000;
  @Input() presetAmounts: number[] = [500, 1000, 2000, 5000];
  
  @Output() close = new EventEmitter<void>();
  @Output() topup = new EventEmitter<number>();
  
  selectedAmount: number = 0;
  customAmount: number = 0;
  isProcessing: boolean = false;

  get topupAmountValue(): number {
    if (this.customAmount && this.customAmount > 0) {
      return this.customAmount;
    }
    if (this.selectedAmount && this.selectedAmount > 0) {
      return this.selectedAmount;
    }
    return 0;
  }

  get isAmountValid(): boolean {
    const amount = this.topupAmountValue;
    return amount >= this.minAmount && amount <= this.maxAmount;
  }

  selectAmount(amount: number): void {
    this.selectedAmount = amount;
    this.customAmount = 0;
  }

  onCustomAmountChange(): void {
    if (this.customAmount > 0) {
      this.selectedAmount = 0;
    }
  }

  closeModal(): void {
    this.reset();
    this.close.emit();
  }

  processTopup(): void {
    const amount = this.topupAmountValue;
    if (!this.isAmountValid) return;
    
    this.isProcessing = true;
    this.topup.emit(amount);
  }

  reset(): void {
    this.selectedAmount = 0;
    this.customAmount = 0;
    this.isProcessing = false;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }
}