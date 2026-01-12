import { CommonModule } from '@angular/common';
import { Component, LOCALE_ID, OnInit } from '@angular/core';

import localeRu from '@angular/common/locales/ru';
import { registerLocaleData } from '@angular/common';
registerLocaleData(localeRu);

interface NewsItem {
  id: number;
  title: string;
  summary: string;
  image: string;
  date: string;
}

@Component({
  selector: 'app-news',
  imports: [CommonModule],
  providers: [
    { provide: LOCALE_ID, useValue: 'ru-RU' }, // Устанавливаем локаль по умолчанию
  ],
  templateUrl: './news.component.html',
  styleUrl: './news.component.scss',
})
export class NewsComponent implements OnInit {
  news: NewsItem[] = [];

  constructor() {}

  ngOnInit(): void {
    // Здесь данные могут быть загружены с API
    this.news = [
      {
        id: 1,
        title: 'Запуск нового продукта',
        summary:
          'Мы рады объявить о запуске нашего нового продукта для удобства пользователей.',
        image:
          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        date: '2025-08-27',
      },
      {
        id: 2,
        title: 'Обновление мобильного приложения',
        summary:
          'Наше мобильное приложение теперь поддерживает новые функции и улучшенную навигацию.',
        image:
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
        date: '2025-08-25',
      },
      {
        id: 3,
        title: 'Сезонная распродажа',
        summary:
          'Не пропустите сезонную распродажу с скидками до 50% на все категории!',
        image:
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80',
        date: '2025-08-20',
      },
      {
        id: 1,
        title: 'Запуск нового продукта',
        summary:
          'Мы рады объявить о запуске нашего нового продукта для удобства пользователей.',
        image:
          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        date: '2025-08-27',
      },
      {
        id: 2,
        title: 'Обновление мобильного приложения',
        summary:
          'Наше мобильное приложение теперь поддерживает новые функции и улучшенную навигацию.',
        image:
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
        date: '2025-08-25',
      },
      {
        id: 3,
        title: 'Сезонная распродажа',
        summary:
          'Не пропустите сезонную распродажу с скидками до 50% на все категории!',
        image:
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80',
        date: '2025-08-20',
      },
      {
        id: 1,
        title: 'Запуск нового продукта',
        summary:
          'Мы рады объявить о запуске нашего нового продукта для удобства пользователей.',
        image:
          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=400&q=80',
        date: '2025-08-27',
      },
      {
        id: 2,
        title: 'Обновление мобильного приложения',
        summary:
          'Наше мобильное приложение теперь поддерживает новые функции и улучшенную навигацию.',
        image:
          'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=400&q=80',
        date: '2025-08-25',
      },
      {
        id: 3,
        title: 'Сезонная распродажа',
        summary:
          'Не пропустите сезонную распродажу с скидками до 50% на все категории!',
        image:
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=400&q=80',
        date: '2025-08-20',
      },
    ];
  }
}
