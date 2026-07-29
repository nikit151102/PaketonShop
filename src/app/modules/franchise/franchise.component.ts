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

interface BenefitItem {
  title: string;
  desc: string;
  icon: string;
}

@Component({
  selector: 'app-franchise',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './franchise.component.html',
  styleUrl: './franchise.component.scss',
})
export class FranchiseComponent implements OnInit, OnDestroy, AfterViewInit {
  activeFranchise: 'large' | 'mini' = 'large';

  // ─── Данные: Рынок и О компании ───
  marketStats = [
    { value: '670+ млрд ₽', label: 'Объём рынка упаковки в РФ' },
    { value: '5–8%', label: 'Ежегодный рост рынка' },
    { value: '8000+', label: 'Наименований в ассортименте' },
    { value: '20 лет', label: 'История развития компании' },
  ];

  // ─── Данные: Преимущества (Крупная) ───
  largeBenefits: BenefitItem[] = [
    {title: 'Доход с первого месяца', desc: 'Гарантированная выручка благодаря готовой товарной матрице и маркетинговому плану.', icon: 'wallet'},
    {title: 'Рост выручки 30–100%', desc: 'Ежемесячное увеличение оборота за счёт расширения B2B-клиентской базы.', icon: 'chart-up'},
    {title: 'Масштабирование B2B', desc: 'Увеличьте прибыль в 2–3 раза, заключая контракты с производствами, барами и медицинскими учреждениями.', icon: 'building'},
    {title: 'Полная автоматизация', desc: 'Готовое ПО для магазина, отчёты P&L, ведение бухгалтерии и учёт товародвижения.', icon: 'computer'}
  ];

  // ─── Данные: Преимущества (Мини) ───
  miniBenefits: BenefitItem[] = [
    {title: 'Поддержка на всех этапах', desc: 'Полное сопровождение от подбора помещения до первых продаж и дальнейшей работы.', icon: 'users'},
    {title: 'Проверенная бизнес-модель', desc: 'Готовые регламенты, стандарты работы и товарная матрица для минимаркета.', icon: 'chart-up'},
    {title: 'Обучение и сопровождение', desc: 'Передаём все необходимые знания для успешного управления вашей точкой.', icon: 'graduation'},
    {title: 'Стабильная прибыль', desc: 'Рентабельность по прибыли 21% и быстрая окупаемость от 3 до 6 месяцев.', icon: 'wallet'}
  ];

  // ─── Данные: Финансы (Крупная) ───
  largeFinancialMetrics = [
    { label: 'Инвестиции в открытие', value: 'от 1 000 000 ₽', type: 'highlight' },
    { label: 'Средний чек', value: '1 200 ₽', type: 'neutral' },
    { label: 'Клиентов в день', value: 'от 80', type: 'neutral' },
    { label: 'Плановая выручка', value: '1 200 000 ₽', type: 'income' },
    { label: 'Чистая прибыль', value: '159 000 ₽', type: 'income' },
    { label: 'Окупаемость (T5)', value: '10–14 месяцев', type: 'highlight' },
  ];

  largeProfitBreakdown: FinancialItem[] = [
    { label: 'Выручка', value: '1 200 000 ₽', type: 'income' },
    { label: 'Себестоимость (60%)', value: '− 720 000 ₽', type: 'expense' },
    { label: 'Аренда помещения', value: '− 100 000 ₽', type: 'expense' },
    { label: 'ЗП персонала', value: '− 150 000 ₽', type: 'expense' },
    { label: 'Маркетинг и прочее', value: '− 71 000 ₽', type: 'expense' },
    { label: 'Чистая прибыль', value: '159 000 ₽', type: 'highlight' },
  ];

  // ─── Данные: Финансы (Мини) ───
  miniFinancialMetrics = [
    { label: 'Инвестиции в товар', value: '500 000 ₽', type: 'highlight' },
    { label: 'Средний чек', value: '600–800 ₽', type: 'neutral' },
    { label: 'Покупателей в месяц', value: '900–1 100', type: 'neutral' },
    { label: 'Точка безубыточности', value: '400–450 тыс. ₽', type: 'neutral' },
    { label: 'Рентабельность', value: '21%', type: 'income' },
    { label: 'Окупаемость', value: '3–6 месяцев', type: 'highlight' },
  ];

  miniProfitBreakdown: FinancialItem[] = [
    { label: 'Выручка (при 100% продаже)', value: '750 000 ₽', type: 'income' },
    { label: 'Себестоимость (закуп товара)', value: '− 500 000 ₽', type: 'expense' },
    { label: 'Валовая прибыль (наценка 50%)', value: '250 000 ₽', type: 'highlight' },
    { label: 'Аренда', value: '− 30 000 ₽', type: 'expense' },
    { label: 'Управленческие расходы', value: '− 30 000 ₽', type: 'expense' },
    { label: 'Налоги', value: '− 28 500 ₽', type: 'expense' },
    { label: 'Итоговая прибыль', value: '161 500 ₽', type: 'highlight' },
  ];

  // ─── Данные: Этапы открытия (Крупная - 10 шагов) ───
  largeRoadmapSteps: RoadmapStep[] = [
    { title: 'Заявка и знакомство', desc: 'Оставляете заявку, и мы проводим бесплатную 30-минутную консультацию о потенциале вашего города.', icon: 'clipboard', details: ['Анализ вашего региона', 'Ответы на все вопросы'] },
    { title: 'Финансовая модель', desc: 'Готовим персональный расчет окупаемости и прибыли конкретно под ваши условия и бюджет.', icon: 'chart', details: ['Прогноз ROI', 'Детализация затрат'] },
    { title: 'Подписание договора', desc: 'Юридически закрепляем партнерство. Вы получаете эксклюзивные права на ваш город.', icon: 'file-sign', details: ['Паушальный взнос', 'Юридическая чистота'] },
    { title: 'Подбор помещения', desc: 'Наши эксперты помогают найти идеальную точку 100–350 м² с высоким трафиком и удобной разгрузкой.', icon: 'search', details: ['Оценка трафика', 'Проверка документов'] },
    { title: 'Дизайн и ремонт', desc: 'Передаем готовый дизайн-проект магазина и чек-лист для строителей. Контролируем сроки.', icon: 'tools', details: ['Фирменный стиль', 'Авторский надзор'] },
    { title: 'Оснащение оборудованием', desc: 'Отгружаем торговое оборудование и технику напрямую с нашего распределительного центра.', icon: 'grid', details: ['Логистика под ключ', 'Монтаж и настройка'] },
    { title: 'Загрузка ассортимента', desc: 'Формируем стартовый заказ из 8000+ SKU самых ходовых позиций для вашего региона.', icon: 'clipboard', details: ['Товарная матрица', 'Система учета 1С'] },
    { title: 'Обучение команды', desc: 'Проводим интенсив для вас и ваших продавцов: стандарты продаж, работа с ПО и B2B-клиентами.', icon: 'graduation', details: ['База знаний', 'Тестирование персонала'] },
    { title: 'Маркетинговый запуск', desc: 'Организуем яркое открытие, настраиваем локальную рекламу и запускаем базу B2B-клиентов.', icon: 'megaphone', details: ['Рекламные материалы', 'Первые оптовые контракты'] },
    { title: 'Первая прибыль и поддержка', desc: 'Вы выходите на плановые показатели. Мы остаемся на связи 24/7 для масштабирования.', icon: 'flag', details: ['Ежемесячный аудит', 'Помощь в масштабировании'] }
  ];

  // ─── Данные: Этапы открытия (Мини - 5 шагов) ───
  miniRoadmapSteps: RoadmapStep[] = [
    {
      title: 'Принятие решения',
      desc: 'Стартовая точка: вы принимаете решение открыть франшизу минимаркет «Пакетон.РФ».',
      icon: 'clipboard',
      details: ['Ознакомление с условиями', 'Предварительный расчёт']
    },
    {
      title: 'Подбор помещения (30–50 м²)',
      desc: 'Если помещение уже есть и соответствует требованиям — переходим дальше. Если нет — помогаем подобрать.',
      icon: 'search',
      details: ['Площадь: 30–50 м²', 'Средняя стоимость аренды: от 30 000 ₽']
    },
    {
      title: 'Товарная матрица и модель',
      desc: 'Подбираем ассортимент под локацию и аудиторию. Формируем финансовую модель.',
      icon: 'chart',
      details: ['Стоимость товара: 500 000 ₽', 'Средний чек: 600–800 ₽', 'Точка безубыточности: 400–450 тыс. ₽']
    },
    {
      title: 'Закуп товара и запуск',
      desc: 'Организуем поставку стартового ассортимента и настройку всех процессов.',
      icon: 'grid',
      details: ['Отгрузка с РЦ', 'Настройка учёта и кассы']
    },
    {
      title: 'Способы продаж и рост',
      desc: 'Работаем через магазин и интернет-магазин. Масштабируем прибыль за счёт постоянных клиентов.',
      icon: 'megaphone',
      details: ['Розничные продажи', 'Доставка и выдача как ПВЗ']
    }
  ];

  // ─── Геттеры для динамического отображения ───
  get currentMetrics() {
    return this.activeFranchise === 'large' ? this.largeFinancialMetrics : this.miniFinancialMetrics;
  }

  get currentBreakdown() {
    return this.activeFranchise === 'large' ? this.largeProfitBreakdown : this.miniProfitBreakdown;
  }

  get currentRoadmap() {
    return this.activeFranchise === 'large' ? this.largeRoadmapSteps : this.miniRoadmapSteps;
  }

  // ─── Данные: Города ───
  cities = ['Алейск', 'Барнаул', 'Бийск', 'Бердск', 'Белокуриха', 'Заринск', 'Камень-на-Оби', 'Новоалтайск', 'Новокузнецк', 'Новосибирск', 'Омск', 'Славгород', 'Рубцовск', 'Тюмень', 'Горно-Алтайск'];

  // ─── Данные: FAQ ──
  faqItems = [
    { q: 'Нужен ли опыт в розничной торговле?', a: 'Нет, не нужен. Мы предоставляем пошаговые инструкции, обучаем вас и вашу команду, а персональный куратор сопровождает на всех этапах.', open: false },
    { q: 'Как формируется ассортимент?', a: 'Мы проводим анализ вашего города и локации. Ассортимент подбирается индивидуально для максимальной оборачиваемости.', open: false },
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
}