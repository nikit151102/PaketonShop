import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-loyalty-system',
  imports: [CommonModule, FormsModule],
  templateUrl: './loyalty-system.component.html',
  styleUrl: './loyalty-system.component.scss'
})
export class LoyaltySystemComponent implements OnInit, AfterViewInit {
  /* ── Calculator Logic ── */
  calcMin = 50_000;
  calcMax = 10_000_000;
  calcStep = 50_000;
  calcTurnover = 500_000;
  calcCap = 150_000;

  get calcRate(): number {
    return this.calcTurnover >= 500_000 ? 5 : 3;
  }

  get calcReward(): number {
    const raw = (this.calcTurnover * this.calcRate) / 100;
    return Math.min(raw, this.calcCap);
  }

  get calcFill(): number {
    return ((this.calcTurnover - this.calcMin) / (this.calcMax - this.calcMin)) * 100;
  }

  get calcTable() {
    const rows = [
      { turnover: '50 000 ₽', rate: 3, reward: '1 500 ₽', threshold: 50_000 },
      { turnover: '100 000 ₽', rate: 3, reward: '3 000 ₽', threshold: 100_000 },
      { turnover: '500 000 ₽', rate: 5, reward: '25 000 ₽', threshold: 500_000 },
      { turnover: '1 000 000 ₽', rate: 5, reward: '50 000 ₽', threshold: 1_000_000 },
      { turnover: '3 000 000 ₽', rate: 5, reward: '150 000 ₽', threshold: 3_000_000 },
    ];
    return rows.map((r) => ({
      ...r,
      active: this.calcTurnover >= r.threshold && this.calcTurnover < r.threshold * 2,
    }));
  }

  /* ── FAQ Data ── */
  faqItems = [
    {
      q: 'Когда именно производится выплата?',
      a: 'Расчётный период — календарный месяц. Выплата производится до 15-го числа месяца, следующего за отчётным (например, за январь — до 15 февраля).',
      open: false,
    },
    {
      q: 'Существует ли потолок вознаграждения?',
      a: 'Да, максимальная сумма выплаты составляет 150 000 ₽ в месяц на одного агента, независимо от превышения оборота.',
      open: false,
    },
    {
      q: 'Что происходит, если клиент оплатил заказ частично?',
      a: 'Вознаграждение начисляется пропорционально только на сумму, фактически поступившую на наш расчётный счёт. При просрочке платежа клиентом более 30 дней начисление приостанавливается.',
      open: false,
    },
    {
      q: 'Обязательно ли регистрировать ИП или самозанятость?',
      a: 'Нет, физические лица могут участвовать на общих условиях. В этом случае мы выступаем налоговым агентом и удерживаем НДФЛ (13%) при выплате.',
      open: false,
    },
    {
      q: 'Как я могу контролировать свои начисления?',
      a: 'Вам будет предоставлен доступ в личный кабинет партнёра, где в режиме реального времени отображаются привлечённые клиенты, сумма их заказов и статус ваших выплат.',
      open: false,
    },
  ];

  toggleFaq(index: number): void {
    this.faqItems.forEach((item, i) => {
      item.open = i === index ? !item.open : false;
    });
  }

  /* ── Floating CTA ── */
  showFloating = false;

  @HostListener('window:scroll')
  onScroll(): void {
    this.showFloating = window.scrollY > 500;
  }

  /* ── Form Handling ── */
  onSubmit(): void {
    // Здесь будет интеграция с вашей CRM (например, отправка через HttpClient)
    alert('Заявка успешно отправлена. Менеджер свяжется с вами в течение 1 рабочего дня для обсуждения деталей.');
  }

  constructor(private el: ElementRef) {}

  ngOnInit(): void {}

  /* ── Scroll Reveal Animation ── */
  ngAfterViewInit(): void {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Анимируем только один раз для производительности
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    this.el.nativeElement.querySelectorAll('.reveal').forEach((el: HTMLElement) => {
      observer.observe(el);
    });
  }
}
