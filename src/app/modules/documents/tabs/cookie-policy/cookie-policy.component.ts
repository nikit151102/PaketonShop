import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cookie-policy',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cookie-policy.component.html',
  styleUrls: ['./cookie-policy.component.scss']
})
export class CookiePolicyComponent implements OnInit {
  currentDate: Date = new Date();
  
  companyInfo = {
    name: 'ООО «Сервисмаркет»',
    ogrn: '1215400016952',
    inn: '5404205450',
    kpp: '540401001',
    email: 'paketon@bk.ru',
    site: 'пакетон.рф',
    address: '630107, Новосибирская область, г. Новосибирск, ул. Севостьянова, 9-322'
  };

  cookieSections = [
    { id: 'what-is', title: 'Что такое файлы cookie' },
    { id: 'types', title: 'Типы используемых cookie' },
    { id: 'purposes', title: 'Цели использования cookie' },
    { id: 'third-party', title: 'Сторонние сервисы' },
    { id: 'management', title: 'Управление cookie' },
    { id: 'browser-settings', title: 'Настройки в браузерах' },
    { id: 'changes', title: 'Изменения в политике' }
  ];

  cookieTypes = [
    {
      name: 'Технические (обязательные)',
      description: 'Необходимы для работы сайта, обеспечивают базовую функциональность, безопасность и навигацию. Без них сайт не может работать корректно.',
      duration: 'Сессионные',
      required: true
    },
    {
      name: 'Функциональные',
      description: 'Запоминают ваши предпочтения: язык, регион, настройки отображения. Позволяют персонализировать опыт использования сайта.',
      duration: 'До 1 года',
      required: false
    },
    {
      name: 'Аналитические',
      description: 'Собирают информацию о том, как посетители используют сайт: какие страницы посещают, как перемещаются по сайту. Помогают улучшать работу ресурса.',
      duration: 'До 2 лет',
      required: false
    },
    {
      name: 'Маркетинговые',
      description: 'Используются для показа релевантной рекламы, отслеживания эффективности рекламных кампаний и ограничения количества показов объявлений.',
      duration: 'До 2 лет',
      required: false
    }
  ];

  purposes = [
    {
      title: 'Обеспечение работы сайта',
      description: 'Технические cookie необходимы для корректной работы всех функций сайта, включая авторизацию, корзину покупок и безопасные соединения.'
    },
    {
      title: 'Персонализация',
      description: 'Запоминание ваших предпочтений, настроек языка, региона и других параметров для улучшения пользовательского опыта.'
    },
    {
      title: 'Анализ и статистика',
      description: 'Сбор анонимной статистики о посещаемости и использовании сайта для понимания потребностей пользователей и улучшения сервиса.'
    },
    {
      title: 'Маркетинг и реклама',
      description: 'Показ релевантных рекламных предложений, оценка эффективности маркетинговых кампаний и оптимизация рекламных бюджетов.'
    },
    {
      title: 'Безопасность',
      description: 'Защита от мошенничества, обнаружение подозрительной активности и обеспечение безопасности пользовательских данных.'
    }
  ];

  thirdPartyServices = [
    {
      name: 'Яндекс.Метрика',
      purpose: 'Анализ посещаемости сайта и поведения пользователей'
    },
    {
      name: 'Google Analytics',
      purpose: 'Статистика посещений и анализ эффективности сайта'
    },
    {
      name: 'Яндекс.Директ',
      purpose: 'Показ рекламных объявлений и ретаргетинг'
    },
    {
      name: 'Google Ads',
      purpose: 'Рекламные кампании и конверсионное отслеживание'
    }
  ];

  managementMethods = [
    {
      title: 'Через настройки браузера',
      description: 'Большинство браузеров позволяют управлять cookie через настройки конфиденциальности. Вы можете удалять существующие cookie или блокировать новые.'
    },
    {
      title: 'Через баннер согласия',
      description: 'При первом посещении сайта вы можете выбрать, какие типы cookie разрешить. Настройки можно изменить в любое время.'
    },
    {
      title: 'Через специальные расширения',
      description: 'Существуют браузерные расширения для управления cookie, такие как Ghostery, Privacy Badger или uBlock Origin.'
    },
    {
      title: 'Режим инкогнито',
      description: 'При использовании режима инкогнито cookie удаляются автоматически после закрытия окна браузера.'
    }
  ];

  browsers = [
    {
      name: 'Google Chrome',
      instructions: 'Настройки → Конфиденциальность и безопасность → Файлы cookie'
    },
    {
      name: 'Mozilla Firefox',
      instructions: 'Настройки → Приватность и защита → Куки и данные сайтов'
    },
    {
      name: 'Safari',
      instructions: 'Настройки → Конфиденциальность → Блокировать куки'
    },
    {
      name: 'Microsoft Edge',
      instructions: 'Настройки → Куки и разрешения сайтов → Управление куки'
    },
    {
      name: 'Opera',
      instructions: 'Настройки → Конфиденциальность и безопасность → Куки'
    }
  ];

  ngOnInit() {
    this.checkConsent();
  }

  checkConsent() {
    const consent = localStorage.getItem('cookie_consent');
    if (consent) {
    }
  }

  acceptCookies() {
    localStorage.setItem('cookie_consent', 'accepted');
  }

  declineCookies() {
    localStorage.setItem('cookie_consent', 'declined');
  }
}