import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export type InvoiceDeliveryMethod = 'sbis' | 'kontur' | 'email';

@Component({
  selector: 'app-invoice-delivery',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './invoice-delivery.component.html',
  styleUrls: ['./invoice-delivery.component.scss']
})
export class InvoiceDeliveryComponent {
  @Input() deliveryMethod: InvoiceDeliveryMethod = 'email';
  @Input() email: string = '';
  @Input() showEmailField: boolean = true;
  
  @Output() deliveryMethodChange = new EventEmitter<InvoiceDeliveryMethod>();
  @Output() emailChange = new EventEmitter<string>();
  @Output() deliverySelected = new EventEmitter<{ method: InvoiceDeliveryMethod; email: string }>();

  selectMethod(method: InvoiceDeliveryMethod): void {
    this.deliveryMethod = method;
    this.deliveryMethodChange.emit(method);
    this.emitSelection();
  }

  onEmailChange(value: string): void {
    this.email = value;
    this.emailChange.emit(value);
    this.emitSelection();
  }

  private emitSelection(): void {
    this.deliverySelected.emit({
      method: this.deliveryMethod,
      email: this.email
    });
  }

  isValid(): boolean {
    if (this.deliveryMethod === 'email') {
      return this.isValidEmail(this.email);
    }
    return true;
  }

  // Изменяем private на public
  public isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}