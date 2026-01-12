import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface Question {
  id: number;
  product: string;
  question: string;
  answer?: string;
  date: Date;
  image?: string;
}

@Component({
  selector: 'app-questions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './questions.component.html',
  styleUrls: ['./questions.component.scss'],
})
export class QuestionsComponent {
  questions: Question[] = [
    {
      id: 1,
      product: 'Бумажные стаканы 250 мл, 50 шт.',
      question: 'Можно ли использовать их для горячих напитков?',
      answer: 'Да, эти стаканы рассчитаны на температуру до 90°C.',
      date: new Date('2025-08-20'),
      image:
        'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
    },
    {
      id: 2,
      product: 'Бумажные стаканы 500 мл, 100 шт.',
      question: 'Подходит ли этот размер для кофе латте?',
      answer: 'Да, идеально подходит для больших порций кофе.',
      date: new Date('2025-08-21'),
      image:
        'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
    },
    {
      id: 3,
      product: 'Бумажные стаканы с цветным принтом, 200 шт.',
      question: 'Можно ли печатать свой логотип на этих стаканах?',
      answer: 'Да, возможна персонализация по вашему макету.',
      date: new Date('2025-08-22'),
      image:
        'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
    },
    {
      id: 4,
      product: 'Бумажные стаканы 350 мл, 50 шт.',
      question: 'Эти стаканы безопасны для холодных напитков?',
      date: new Date('2025-08-23'),
      image:
        'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
    },
  ];
}
