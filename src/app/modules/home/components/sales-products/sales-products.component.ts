import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { ProductComponent } from '../../../../core/components/product/product.component';
import { PromoOrderGroupService } from '../../../../core/api/promo-order-group.service';
import { ProductsService } from '../../../../core/services/products.service';
import { PromoOrderGroupWithState } from '../../../../core/interfaces/promo.interface';
import { fromEvent, merge, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged, filter, throttleTime } from 'rxjs/operators';

type PromoGroupStatus = 'active' | 'upcoming' | 'completed';

@Component({
  selector: 'app-sales-products',
  imports: [CommonModule, ProductComponent],
  templateUrl: './sales-products.component.html',
  styleUrl: './sales-products.component.scss',
})
export class SalesProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChildren('groupContainer') groupContainers!: QueryList<ElementRef>;

  promoGroups: PromoOrderGroupWithState[] = [];
  isLoading = true;

  private autoScrollIntervals: Map<string, any> = new Map();
  private scrollSubscriptions: Map<string, Subscription> = new Map();
  private readonly CARD_WIDTH = 280; // 🔹 Приблизительная ширина карточки + отступ
  private readonly AUTO_SCROLL_DELAY = 4000; // 🔹 Пауза между авто-скроллами (мс)
  private readonly AUTO_SCROLL_AMOUNT = 280; // 🔹 На сколько пикселей скроллить (одна карточка)
  private readonly SCROLL_THRESHOLD = 100; // 🔹 Сколько пикселей до конца для подгрузки

  private promoOrderGroupService = inject(PromoOrderGroupService);
  private productsService = inject(ProductsService);


  ngOnInit(): void {
    this.loadPromoGroups();
  }

  ngAfterViewInit(): void {
    // 🔹 Инициализируем скролл-слушатели после отрисовки
    setTimeout(() => this.initGroupScrolls(), 200);
  }

  private loadPromoGroups(): void {
    this.isLoading = true;

    this.promoOrderGroupService
      .getPromoOrderGroups(0, 10)
      .subscribe({
        next: (response) => {
          const groups = response.data
            .filter((g: any) => !g.isDeleted)
            .map((group: any) => ({
              ...group,
              // 🔹 Инициализация состояния пагинации
              productsPage: 0,
              productsPageSize: 10,
              hasMoreProducts: true,
              isLoadingMore: false,
              totalProducts: 0,
              // 🔹 Инициализация состояния авто-скролла
              autoScrollEnabled: true,
              lastUserScroll: Date.now(),
              // 🔹 Массив товаров для отображения
              products: [] as any[]
            })) as PromoOrderGroupWithState[];

          this.promoGroups = groups;
          this.isLoading = false;

          // 🔹 Загружаем первые 10 товаров для каждой группы
          groups.forEach((group, index) => {
            setTimeout(() => {
              this.loadProductsForGroup(group.id, 0);
            }, index * 150); // 🔹 Небольшая задержка между запросами
          });
        },
        error: (err) => {
          console.error('Ошибка загрузки групп акций:', err);
          this.isLoading = false;
        },
      });
  }

  // 🔹 Загрузка товаров для конкретной группы
  loadProductsForGroup(groupId: string, page: number): void {
    const group: any = this.promoGroups.find(g => g.id === groupId);
    if (!group || !group.hasMoreProducts || group.isLoadingMore) return;

    group.isLoadingMore = true;

    const filters = [
      {
        field: 'Text',
        values: [],
        type: 0,
      },
      {
        field: 'PromoOrders.Id',
        values: [groupId],
        type: 11,
      }
    ];

    this.productsService
      .getAllSearch(filters, null, page, group.productsPageSize)
      .subscribe({
        next: (res) => {
          const newProducts = res.data || [];

          if (page === 0) {
            // 🔹 Первая страница — заменяем массив
            group.products = newProducts;
          } else {
            // 🔹 Последующие страницы — добавляем к существующим
            group.products = [...group.products, ...newProducts];
          }

          group.totalProducts = res.totalCount || 0;
          group.hasMoreProducts = newProducts.length === group.productsPageSize;
          group.productsPage = page + 1;
          group.isLoadingMore = false;

          // 🔹 После загрузки пересчитываем ширину и запускаем авто-скролл
          setTimeout(() => {
            this.updateGroupScroll(groupId);
            this.startAutoScroll(groupId);
          }, 100);
        },
        error: (err) => {
          console.error(`Ошибка загрузки товаров для группы ${groupId}:`, err);
          group.isLoadingMore = false;
          group.hasMoreProducts = false;
        },
      });
  }

  // 🔹 Инициализация скролл-слушателей для каждой группы
  private initGroupScrolls(): void {
    this.groupContainers.forEach((containerRef, index) => {
      const groupId = this.promoGroups[index]?.id;
      if (!groupId) return;

      const container = containerRef.nativeElement as HTMLElement;

      // 🔹 Отслеживаем скролл пользователя
      const scroll$ = fromEvent(container, 'scroll').pipe(
        debounceTime(150),
        throttleTime(200)
      );

      const subscription = scroll$.subscribe(() => {
        this.onGroupScroll(groupId, container);
      });

      this.scrollSubscriptions.set(groupId, subscription);

      // 🔹 Запускаем авто-скролл после инициализации
      setTimeout(() => this.startAutoScroll(groupId), 1000);
    });
  }

  // 🔹 Обработка скролла внутри группы
  private onGroupScroll(groupId: string, container: HTMLElement): void {
    const group = this.promoGroups.find(g => g.id === groupId);
    if (!group) return;

    // 🔹 Фиксируем время последнего скролла пользователя
    group.lastUserScroll = Date.now();
    group.autoScrollEnabled = false;

    // 🔹 Проверяем, нужно ли подгрузить ещё товары
    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const remaining = scrollWidth - scrollLeft - clientWidth;

    if (remaining <= this.SCROLL_THRESHOLD && group.hasMoreProducts && !group.isLoadingMore) {
      this.loadProductsForGroup(groupId, group.productsPage);
    }

    // 🔹 Возвращаем авто-скролл через 5 секунд бездействия
    setTimeout(() => {
      if (Date.now() - group.lastUserScroll >= 5000) {
        group.autoScrollEnabled = true;
      }
    }, 5000);
  }

  // 🔹 Запуск авто-скролла для группы
  private startAutoScroll(groupId: string): void {
    // 🔹 Останавливаем предыдущий интервал, если есть
    this.stopAutoScroll(groupId);

    const group = this.promoGroups.find(g => g.id === groupId);
    if (!group) return;

    const interval = setInterval(() => {
      const containerEl = this.groupContainers?.toArray()[this.promoGroups.indexOf(group)]?.nativeElement;
      if (!containerEl || !group.autoScrollEnabled) return;

      const container = containerEl as HTMLElement;
      const scrollWidth = container.scrollWidth;
      const clientWidth = container.clientWidth;
      const maxScroll = scrollWidth - clientWidth;

      // 🔹 Если товаров мало или уже в конце — не скроллим
      if (scrollWidth <= clientWidth + 10) return;

      const currentScroll = container.scrollLeft;

      // 🔹 Если дошли до конца — возвращаемся в начало
      if (currentScroll >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        // 🔹 Скроллим на одну карточку вперёд
        container.scrollBy({
          left: this.AUTO_SCROLL_AMOUNT,
          behavior: 'smooth'
        });
      }
    }, this.AUTO_SCROLL_DELAY);

    this.autoScrollIntervals.set(groupId, interval);
  }

  // 🔹 Остановка авто-скролла для группы
  private stopAutoScroll(groupId: string): void {
    const interval = this.autoScrollIntervals.get(groupId);
    if (interval) {
      clearInterval(interval);
      this.autoScrollIntervals.delete(groupId);
    }
  }

  // 🔹 Обновление параметров скролла после загрузки товаров
  private updateGroupScroll(groupId: string): void {
    const index = this.promoGroups.findIndex(g => g.id === groupId);
    const containerRef = this.groupContainers?.toArray()[index];
    if (!containerRef) return;

    // 🔹 Можно добавить логику пересчёта, если нужно
  }

  // 🔹 Ручная прокрутка влево
  scrollGroupLeft(groupId: string): void {
    const index = this.promoGroups.findIndex(g => g.id === groupId);
    const container = this.groupContainers?.toArray()[index]?.nativeElement as HTMLElement;

    if (container) {
      container.scrollBy({ left: -this.CARD_WIDTH, behavior: 'smooth' });
      this.pauseAutoScroll(groupId);
    }
  }

  // 🔹 Ручная прокрутка вправо
  scrollGroupRight(groupId: string): void {
    const index = this.promoGroups.findIndex(g => g.id === groupId);
    const container = this.groupContainers?.toArray()[index]?.nativeElement as HTMLElement;

    if (container) {
      container.scrollBy({ left: this.CARD_WIDTH, behavior: 'smooth' });
      this.pauseAutoScroll(groupId);
    }
  }

  // 🔹 Пауза авто-скролла при взаимодействии
  private pauseAutoScroll(groupId: string): void {
    const group = this.promoGroups.find(g => g.id === groupId);
    if (group) {
      group.autoScrollEnabled = false;
      group.lastUserScroll = Date.now();

      // 🔹 Возвращаем авто-скролл через 5 секунд
      setTimeout(() => {
        if (group && Date.now() - group.lastUserScroll >= 5000) {
          group.autoScrollEnabled = true;
        }
      }, 5000);
    }
  }

  // 🔹 Форматирование даты
  formatGroupDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // 🔹 Проверка активности группы
  isGroupActive(group: PromoOrderGroupWithState): boolean {
    const now = new Date();
    const start = new Date(group.beginDateTime);
    const end = new Date(group.endDateTime);
    return now >= start && now <= end;
  }

  // 🔹 Отслеживание наведения на группу (для паузы авто-скролла)
  onGroupMouseEnter(groupId: string): void {
    this.pauseAutoScroll(groupId);
  }

  onGroupMouseLeave(groupId: string): void {
    const group = this.promoGroups.find(g => g.id === groupId);
    if (group && Date.now() - group.lastUserScroll >= 3000) {
      group.autoScrollEnabled = true;
    }
  }


  trackByGroup(index: number, group: PromoOrderGroupWithState): string {
    return group.id;
  }

  trackByProduct(index: number, product: any): string {
    return product?.id || index.toString();
  }

  getGroupStatus(group: PromoOrderGroupWithState): PromoGroupStatus {
    const now = new Date();
    const start = new Date(group.beginDateTime);
    const end = new Date(group.endDateTime);

    if (now < start) return 'upcoming';      // 🔹 Ещё не началась
    if (now > end) return 'completed';       // 🔹 Уже закончилась
    return 'active';                         // 🔹 Сейчас активна
  }

  getGroupStatusText(group: PromoOrderGroupWithState): string {
    const status = this.getGroupStatus(group);
    const statusMap: Record<PromoGroupStatus, string> = {
      'active': '● Активна',
      'upcoming': '○ Не началась',
      'completed': '○ Завершена'
    };
    return statusMap[status];
  }

  getGroupStatusClass(group: PromoOrderGroupWithState): string {
    const status = this.getGroupStatus(group);
    return `status-${status}`;
  }

  canBuyFromGroup(group: PromoOrderGroupWithState): boolean {
    const status = this.getGroupStatus(group);
    return status === 'active' || status === 'upcoming';
  }

  formatGroupDateShort(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
    });
  }

  getDaysUntilStart(group: PromoOrderGroupWithState): number | null {
    if (this.getGroupStatus(group) !== 'upcoming') return null;

    const now = new Date();
    const start = new Date(group.beginDateTime);
    const diffTime = start.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  ngOnDestroy(): void {
    // 🔹 Очищаем все интервалы авто-скролла
    this.autoScrollIntervals.forEach((interval) => clearInterval(interval));
    this.autoScrollIntervals.clear();

    // 🔹 Отписываемся от всех скролл-событий
    this.scrollSubscriptions.forEach((sub) => sub.unsubscribe());
    this.scrollSubscriptions.clear();
  }
}