import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-newsletter-consent',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './newsletter-consent.component.html',
  styleUrls: ['./newsletter-consent.component.scss']
})
export class NewsletterConsentComponent implements OnInit {
  currentDate: Date = new Date();

  companyInfo = {
    name: 'ООО «Сервисмаркет»',
    ogrn: '1215400016952',
    inn: '5404205450',
    email: 'paketon@bk.ru',
    site: 'пакетон.рф',
    address: '630107, Новосибирская область, г. Новосибирск, ул. Севостьянова, 9-322'
  };

  consentSections = [
    { id: 'general', title: 'Общие положения' },
    { id: 'what', title: 'Что входит в рассылку' },
    { id: 'contacts', title: 'Какие данные используются' },
    { id: 'channels', title: 'Каналы коммуникации' },
    { id: 'withdraw', title: 'Как отозвать согласие' },
    { id: 'duration', title: 'Срок действия' }
  ];

  ngOnInit() { }
}