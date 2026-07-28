import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, Renderer2 } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface RoadmapStep {
  title: string;
  desc: string;
  details: string[];
  icon: string;
}

interface FinancialItem {
  label: string;
  value: string;
  type: 'neutral' | 'expense' | 'income' | 'highlight';
}

@Component({
  selector: 'app-franchise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './franchise.component.html',
  styleUrl: './franchise.component.scss',
})
export class FranchiseComponent implements OnInit, OnDestroy, AfterViewInit {
  // ─── Данные: Рынок и О компании ───
  marketStats = [
    { value: '670+ млрд ₽', label: 'Объём рынка упаковки в РФ' },
    { value: '5–8%', label: 'Ежегодный рост рынка' },
    { value: '8000+', label: 'Наименований в ассортименте' },
    { value: '20 лет', label: 'История развития компании' },
  ];

  // ─── Данные: Категории продукции ───
  categories = [
    { title: 'Упаковка для еды', desc: 'Контейнеры, ланч-боксы, эко-упаковка', icon: 'box' },
    { title: 'Одноразовая посуда', desc: 'Для HoReCa, фастфудов и кейтеринга', icon: 'utensils' },
    { title: 'Плёнки и пакеты', desc: 'ПВД, ПНД, стрейч-плёнка, майки', icon: 'package' },
    { title: 'Бумажная упаковка', desc: 'Крафт-пакеты, пакеты с логотипом', icon: 'file' },
    { title: 'Для кондитеров', desc: 'Коробки для тортов, подложки, капсулы', icon: 'cake' },
    { title: 'Пластиковые бутылки', desc: 'ПЭТ-тара для напитков и молочной продукции', icon: 'bottle' },
  ];

  // ─── Данные: Финансы (строго ваши цифры) ───
  financialMetrics = [
    { label: 'Инвестиции в открытие', value: 'от 1 000 000 ₽', type: 'highlight' },
    { label: 'Средний чек', value: '1 200 ₽', type: 'neutral' },
    { label: 'Клиентов в день', value: 'от 80', type: 'neutral' },
    { label: 'Плановая выручка', value: '1 200 000 ₽', type: 'income' },
    { label: 'Чистая прибыль', value: '159 000 ₽', type: 'income' },
    { label: 'Окупаемость (T5)', value: '10–14 месяцев', type: 'highlight' },
  ];

  profitBreakdown: FinancialItem[] = [
    { label: 'Выручка', value: '1 200 000 ₽', type: 'income' },
    { label: 'Себестоимость (60%)', value: '− 720 000 ₽', type: 'expense' },
    { label: 'Аренда помещения', value: '− 100 000 ₽', type: 'expense' },
    { label: 'ЗП персонала', value: '− 150 000 ₽', type: 'expense' },
    { label: 'Маркетинг и прочее', value: '− 71 000 ₽', type: 'expense' },
    { label: 'Чистая прибыль', value: '159 000 ₽', type: 'highlight' },
  ];

  // ── Данные: Этапы открытия (10 шагов с деталями) ───
  roadmapSteps: RoadmapStep[] = [
  {
    title: 'Заявка и знакомство',
    desc: 'Оставляете заявку, и мы проводим бесплатную 30-минутную консультацию о потенциале вашего города.',
    icon: 'clipboard',
    details: ['Анализ вашего региона', 'Ответы на все вопросы']
  },
  {
    title: 'Финансовая модель',
    desc: 'Готовим персональный расчет окупаемости и прибыли конкретно под ваши условия и бюджет.',
    icon: 'chart',
    details: ['Прогноз ROI', 'Детализация затрат']
  },
  {
    title: 'Подписание договора',
    desc: 'Юридически закрепляем партнерство. Вы получаете эксклюзивные права на ваш город.',
    icon: 'file-sign',
    details: ['Паушальный взнос', 'Юридическая чистота']
  },
  {
    title: 'Подбор помещения',
    desc: 'Наши эксперты помогают найти идеальную точку 100–350 м² с высоким трафиком и удобной разгрузкой.',
    icon: 'search',
    details: ['Оценка трафика', 'Проверка документов']
  },
  {
    title: 'Дизайн и ремонт',
    desc: 'Передаем готовый дизайн-проект магазина и чек-лист для строителей. Контролируем сроки.',
    icon: 'tools',
    details: ['Фирменный стиль', 'Авторский надзор']
  },
  {
    title: 'Оснащение оборудованием',
    desc: 'Отгружаем торговое оборудование и технику напрямую с нашего распределительного центра.',
    icon: 'grid',
    details: ['Логистика под ключ', 'Монтаж и настройка']
  },
  {
    title: 'Загрузка ассортимента',
    desc: 'Формируем стартовый заказ из 8000+ SKU самых ходовых позиций для вашего региона.',
    icon: 'clipboard', // можно заменить на 'cart' если есть такой icon
    details: ['Товарная матрица', 'Система учета 1С']
  },
  {
    title: 'Обучение команды',
    desc: 'Проводим интенсив для вас и ваших продавцов: стандарты продаж, работа с ПО и B2B-клиентами.',
    icon: 'graduation',
    details: ['База знаний', 'Тестирование персонала']
  },
  {
    title: 'Маркетинговый запуск',
    desc: 'Организуем яркое открытие, настраиваем локальную рекламу и запускаем базу B2B-клиентов.',
    icon: 'megaphone',
    details: ['Рекламные материалы', 'Первые оптовые контракты']
  },
  {
    title: 'Первая прибыль и поддержка',
    desc: 'Вы выходите на плановые показатели. Мы остаемся на связи 24/7 для масштабирования.',
    icon: 'flag',
    details: ['Ежемесячный аудит', 'Помощь в масштабировании']
  }
];

  // ─── Данные: Города ───
  cities = ['Алейск', 'Барнаул', 'Бийск', 'Бердск', 'Белокуриха', 'Заринск', 'Камень-на-Оби', 'Новоалтайск', 'Новокузнецк', 'Новосибирск', 'Омск', 'Славгород', 'Рубцовск', 'Тюменск', 'Тюмень', 'Горно-Алтайск'];
  openFranchises = [
    'г. Горно-Алтайск, пр. Коммунистический, 1/6',
    'г. Ханты-Мансийск, ул. Комсомольская, 63',
    'г. Сочи, ул. Ленина, 96',
  ];

  // ─── Данные: FAQ ──
  faqItems = [
    { q: 'Нужен ли опыт в розничной торговле?', a: 'Нет, не нужен. Мы предоставляем пошаговые инструкции, обучаем вас и вашу команду, а персональный куратор сопровождает на всех этапах.', open: false },
    { q: 'Как формируется ассортимент?', a: 'Мы проводим анализ вашего города и локации. Ассортимент из 8000+ позиций подбирается индивидуально для максимальной оборачиваемости.', open: false },
    { q: 'Какая поддержка оказывается после открытия?', a: 'Полная: от консультаций по ценообразованию и документообороту до организации рекламных акций и отгрузок с нашего распределительного центра.', open: false },
    { q: 'Есть ли эксклюзив на территорию?', a: 'Да, мы закрепляем за партнёром зону присутствия, чтобы исключить внутреннюю конкуренцию и обеспечить стабильный рост вашей клиентской базы.', open: false },
  ];

  // ─── Форма ───
  formName = '';
  formPhone = '';
  formCity = '';
  formSubmitted = false;

  private observer!: IntersectionObserver;

  constructor(private el: ElementRef, private renderer: Renderer2) { }

  ngOnInit(): void { }

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.renderer.addClass(entry.target, 'revealed');
            this.observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    const revealElements = this.el.nativeElement.querySelectorAll('.reveal');
    revealElements.forEach((el: HTMLElement) => this.observer.observe(el));
  }

  ngOnDestroy(): void {
    if (this.observer) this.observer.disconnect();
  }

  toggleFaq(index: number): void {
    this.faqItems[index].open = !this.faqItems[index].open;
  }

  onSubmit(): void {
    if (this.formName && this.formPhone) {
      this.formSubmitted = true;
    }
  }

  scrollToForm(): void {
    const formEl = document.getElementById('cta-final');
    formEl?.scrollIntoView({ behavior: 'smooth' });
  }

  get firstFiveSteps() {
    return this.roadmapSteps.slice(0, 5);
  }

  get lastFiveStepsReversed() {
    return this.roadmapSteps.slice(5, 10).slice().reverse();
  }
}