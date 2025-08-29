import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, HostListener, Output } from '@angular/core';

@Component({
  selector: 'app-select-cart-button',
  imports: [CommonModule],
  templateUrl: './select-cart-button.component.html',
  styleUrl: './select-cart-button.component.scss'
})
export class SelectCartButtonComponent {
  isOpen = false; // состояние окна корзин

  @Output() addToCart = new EventEmitter<void>(); // событие добавления

  constructor(private elementRef: ElementRef) { }

  toggleCartPopup() {
    this.isOpen = !this.isOpen;
  }
  @HostListener('document:click', ['$event.target'])
  onClickOutside(targetElement: HTMLElement) {
    const clickedInside = this.elementRef.nativeElement.contains(targetElement);
    if (!clickedInside) {
      this.isOpen = false;
    }
  }
}
