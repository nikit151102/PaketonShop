import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { PhoneLinkPipe } from "./phone-link.pipe";
import { WhatsappLinkPipe } from "./whatsapp-link.pipe";
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-contacts',
  imports: [CommonModule, PhoneLinkPipe, WhatsappLinkPipe, FormsModule],
  templateUrl: './contacts.component.html',
  styleUrl: './contacts.component.scss'
})
export class ContactsComponent {
  phones = [
    '+7 (3852) 555-861',
    '+7 (3852) 555-862',
    '+7 (3852) 555-863',
    '+7 903 937 31 10'
  ];
  whatsapp = '+7 905 084-51-88';
  email = 'paketon@bk.ru';
  vk = 'https://vk.com';
  telegram = 'https://t.me';
  address = 'г. Барнаул, Попова, 165Б';

  form = {
    name: '',
    email: '',
    message: ''
  };

  onSubmit() {
    console.log('Форма отправлена', this.form);
    alert('Спасибо! Ваше сообщение отправлено.');
    this.form = { name: '', email: '', message: '' };
  }
}