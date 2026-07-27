import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  Renderer2,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-franchise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './franchise.component.html',
  styleUrl: './franchise.component.scss',
})
export class FranchiseComponent implements OnInit, OnDestroy, AfterViewInit {
  // ─── FAQ ───
  faqItems = [
    {
      q: 'Какой стартовый капитал необходим?',
      a: 'Минимальные инвестиции начинаются от 500 000 ₽. Мы поможем оптимизировать затраты и подберём формат, который подходит именно вам.',
      open: false,
    },
    {
      q: 'Сколько времени занимает открытие?',
      a: 'От момента подписания договора до открытия проходит в среднем 4–8 недель. Мы сопровождаем каждый этап.',
      open: false,
    },
    {
      q: 'Нужен ли опыт в торговле?',
      a: 'Нет. Мы обучаем с нуля: от работы с поставщиками до управления командой. У нас отработанные стандарты и пошаговые инструкции.',
      open: false,
    },
    {
      q: 'Какой срок окупаемости?',
      a: 'Средний срок окупаемости — 3–6 месяцев. Точка безубыточности достигается при обороте от 400 000 ₽.',
      open: false,
    },
    {
      q: 'Какая поддержка оказывается после открытия?',
      a: 'Вы получаете персонального менеджера, доступ к CRM, регулярные маркетинговые материалы и оперативную помощь по любым вопросам.',
      open: false,
    },
    {
      q: 'Есть ли эксклюзив на территорию?',
      a: 'Да, за каждым партнёром закрепляется эксклюзивная территория. Мы не открываем competing точки в вашем районе.',
      open: false,
    },
    {
      q: 'Как подбирается ассортимент?',
      a: 'Мы анализируем ваш город, конкурентов и спрос. Ассортимент формируется индивидуально для максимального дохода.',
      open: false,
    },
  ];

  // ─── Calculator ───
  investment = 500000;
  avgCheck = 700;
  clientsPerDay = 25;
  marginPercent = 50;

  get dailyRevenue(): number {
    return this.clientsPerDay * this.avgCheck;
  }
  get monthlyRevenue(): number {
    return this.dailyRevenue * 30;
  }
  get monthlyCOGS(): number {
    return Math.round(this.monthlyRevenue / (1 + this.marginPercent / 100));
  }
  get monthlyGross(): number {
    return this.monthlyRevenue - this.monthlyCOGS;
  }
  get monthlyExpenses(): number {
    const rent = 60000;
    const salaries = 100000;
    const taxes = Math.round(this.monthlyGross * 0.06);
    const other = 25000;
    return rent + salaries + taxes + other;
  }
  get monthlyProfit(): number {
    return this.monthlyGross - this.monthlyExpenses;
  }
  get paybackMonths(): number {
    return this.monthlyProfit > 0 ? Math.ceil(this.investment / this.monthlyProfit) : Infinity;
  }
  get profitability(): number {
    return this.monthlyRevenue > 0
      ? Math.round((this.monthlyProfit / this.monthlyRevenue) * 100)
      : 0;
  }

  // ─── Gallery ───
  galleryImages = [
    { src: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=600&q=80', label: 'Современный магазин' },
    { src: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80', label: 'Ассортимент на полках' },
    { src: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80', label: 'Торговый зал' },
    { src: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=600&q=80', label: 'Склад и логистика' },
    { src: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80', label: 'Обучение команды' },
    { src: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=600&q=80', label: 'Команда Пакетон' },
  ];

  // ─── Form ───
  formName = '';
  formPhone = '';
  formCity = '';
  formSubmitted = false;

  // ─── Scroll animation ───
  private observer!: IntersectionObserver;

  // ─── Sticky CTA ───
  showStickyCta = false;
  private scrollListener!: () => void;

  // ─── Counter animation ───
  animatedValues: { [key: string]: number } = {};

  constructor(private el: ElementRef, private renderer: Renderer2) {}

  ngOnInit(): void {
    // Pre-fill calculator
    this.animatedValues['profit'] = 0;
  }

  ngAfterViewInit(): void {
    // Scroll reveal
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.renderer.addClass(entry.target, 'revealed');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const revealElements =
      this.el.nativeElement.querySelectorAll('.reveal');
    revealElements.forEach((el: HTMLElement) => this.observer.observe(el));

    // Sticky CTA
    this.scrollListener = () => {
      this.showStickyCta = window.scrollY > 800;
    };
    window.addEventListener('scroll', this.scrollListener, { passive: true });

    // Animate counters
    this.animateCounters();

    // Parallax light orbs
    this.initParallax();
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
    if (this.scrollListener)
      window.removeEventListener('scroll', this.scrollListener);
  }

  toggleFaq(index: number): void {
    this.faqItems[index].open = !this.faqItems[index].open;
  }

  onSubmit(): void {
    if (this.formName && this.formPhone) {
      this.formSubmitted = true;
      // Здесь отправка в CRM
      console.log('Lead:', {
        name: this.formName,
        phone: this.formPhone,
        city: this.formCity,
      });
    }
  }

  scrollToForm(): void {
    const formEl = document.getElementById('cta-final');
    formEl?.scrollIntoView({ behavior: 'smooth' });
  }

  formatCurrency(val: number): string {
    return val.toLocaleString('ru-RU');
  }

  private animateCounters(): void {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = parseInt(
              entry.target.getAttribute('data-target') || '0',
              10
            );
            this.countUp(entry.target, target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );

    const counters =
      this.el.nativeElement.querySelectorAll('.counter-animate');
    counters.forEach((el: HTMLElement) => counterObserver.observe(el));
  }


  private countUp(el: any, target: number): void {
  const duration = 2000;
  const startTime = performance.now();

  const step = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
    const current = Math.round(eased * target);
    el.textContent = current.toLocaleString('ru-RU');

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  };

  requestAnimationFrame(step);
}

  private initParallax(): void {
    const handleMove = (e: MouseEvent) => {
      const orbs =
        this.el.nativeElement.querySelectorAll('.parallax-orb');
      const x = (e.clientX / window.innerWidth - 0.5) * 2;
      const y = (e.clientY / window.innerHeight - 0.5) * 2;
      orbs.forEach((orb: HTMLElement, i: number) => {
        const factor = (i + 1) * 15;
        orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
      });
    };
    window.addEventListener('mousemove', handleMove, { passive: true });
  }
}