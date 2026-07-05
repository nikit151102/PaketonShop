import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-floating-contact-buttons',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './floating-contact-buttons.component.html',
  styleUrl: './floating-contact-buttons.component.scss'
})
export class FloatingContactButtonsComponent {
  isExpanded: boolean = false;

  phone: string = '+79050845188';
  whatsapp: string = '79050845188';
  telegram: string = 'paketon';
  vk: string = 'https://vk.com/paketon';

  toggleExpand(): void {
    this.isExpanded = !this.isExpanded;
  }
}