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
import { fromEvent, Subscription } from 'rxjs';
import { debounceTime, throttleTime } from 'rxjs/operators';

type PromoGroupStatus = 'active' | 'upcoming' | 'completed';

@Component({
  selector: 'app-sales-products',
  standalone: true,
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
  private readonly CARD_WIDTH = 280;
  private readonly AUTO_SCROLL_DELAY = 4000;
  private readonly AUTO_SCROLL_AMOUNT = 280;
  private readonly SCROLL_THRESHOLD = 100;

  private promoOrderGroupService = inject(PromoOrderGroupService);
  private productsService = inject(ProductsService);

  ngOnInit(): void {
    this.loadPromoGroups();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initGroupScrolls(), 300);
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
              productsPage: 0,
              productsPageSize: 10,
              hasMoreProducts: true,
              isLoadingMore: false,
              totalProducts: 0,
              autoScrollEnabled: true,
              lastUserScroll: Date.now(),
              products: [] as any[]
            })) as PromoOrderGroupWithState[];

          this.promoGroups = groups;
          this.isLoading = false;

          groups.forEach((group, index) => {
            setTimeout(() => {
              this.loadProductsForGroup(group.id, 0);
            }, index * 150);
          });
        },
        error: (err) => {
          this.isLoading = false;
        },
      });
  }

  loadProductsForGroup(groupId: string, page: number): void {
    const group: any = this.promoGroups.find(g => g.id === groupId);
    if (!group || !group.hasMoreProducts || group.isLoadingMore) return;

    group.isLoadingMore = true;

    const filters = [
      { field: 'Text', values: [], type: 0 },
      { field: 'PromoOrders.Id', values: [groupId], type: 11 }
    ];

    this.productsService
      .getAllSearch(filters, null, page, group.productsPageSize)
      .subscribe({
        next: (res) => {
          const newProducts = res.data || [];

          if (page === 0) {
            group.products = newProducts;
          } else {
            group.products = [...group.products, ...newProducts];
          }

          group.totalProducts = res.totalCount || 0;
          group.hasMoreProducts = newProducts.length === group.productsPageSize;
          group.productsPage = page + 1;
          group.isLoadingMore = false;

          setTimeout(() => {
            this.updateGroupScroll(groupId);
            this.startAutoScroll(groupId);
          }, 100);
        },
        error: (err) => {
          group.isLoadingMore = false;
          group.hasMoreProducts = false;
        },
      });
  }

  private initGroupScrolls(): void {
    this.groupContainers.forEach((containerRef, index) => {
      const groupId = this.promoGroups[index]?.id;
      if (!groupId) return;

      const container = containerRef.nativeElement as HTMLElement;

      const scroll$ = fromEvent(container, 'scroll').pipe(
        debounceTime(150),
        throttleTime(200)
      );

      const subscription = scroll$.subscribe(() => {
        this.onGroupScroll(groupId, container);
      });

      this.scrollSubscriptions.set(groupId, subscription);
      setTimeout(() => this.startAutoScroll(groupId), 1000);
    });
  }

  private onGroupScroll(groupId: string, container: HTMLElement): void {
    const group = this.promoGroups.find(g => g.id === groupId);
    if (!group) return;

    group.lastUserScroll = Date.now();
    group.autoScrollEnabled = false;

    const scrollLeft = container.scrollLeft;
    const scrollWidth = container.scrollWidth;
    const clientWidth = container.clientWidth;
    const remaining = scrollWidth - scrollLeft - clientWidth;

    if (remaining <= this.SCROLL_THRESHOLD && group.hasMoreProducts && !group.isLoadingMore) {
      this.loadProductsForGroup(groupId, group.productsPage);
    }

    setTimeout(() => {
      if (Date.now() - group.lastUserScroll >= 5000) {
        group.autoScrollEnabled = true;
      }
    }, 5000);
  }

  private startAutoScroll(groupId: string): void {
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

      if (scrollWidth <= clientWidth + 10) return;

      const currentScroll = container.scrollLeft;

      if (currentScroll >= maxScroll - 10) {
        container.scrollTo({ left: 0, behavior: 'smooth' });
      } else {
        container.scrollBy({ left: this.AUTO_SCROLL_AMOUNT, behavior: 'smooth' });
      }
    }, this.AUTO_SCROLL_DELAY);

    this.autoScrollIntervals.set(groupId, interval);
  }

  private stopAutoScroll(groupId: string): void {
    const interval = this.autoScrollIntervals.get(groupId);
    if (interval) {
      clearInterval(interval);
      this.autoScrollIntervals.delete(groupId);
    }
  }

  private updateGroupScroll(groupId: string): void {
    const index = this.promoGroups.findIndex(g => g.id === groupId);
    const containerRef = this.groupContainers?.toArray()[index];
    if (!containerRef) return;
  }

  // 🔹 ИСПРАВЛЕННЫЕ МЕТОДЫ СКРОЛЛА
  scrollGroupLeft(groupId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const container = document.querySelector(`.products-container[data-group-id="${groupId}"]`) as HTMLElement;
    if (container) {
      container.scrollLeft = Math.max(0, container.scrollLeft - this.CARD_WIDTH);
      this.pauseAutoScroll(groupId);
    }
  }

  scrollGroupRight(groupId: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    const container = document.querySelector(`.products-container[data-group-id="${groupId}"]`) as HTMLElement;
    if (container) {
      container.scrollLeft = container.scrollLeft + this.CARD_WIDTH;
      this.pauseAutoScroll(groupId);
    }
  }

  private pauseAutoScroll(groupId: string): void {
    const group = this.promoGroups.find(g => g.id === groupId);
    if (group) {
      group.autoScrollEnabled = false;
      group.lastUserScroll = Date.now();

      setTimeout(() => {
        if (group && Date.now() - group.lastUserScroll >= 5000) {
          group.autoScrollEnabled = true;
        }
      }, 5000);
    }
  }

  formatGroupDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  isGroupActive(group: PromoOrderGroupWithState): boolean {
    const now = new Date();
    const start = new Date(group.beginDateTime);
    const end = new Date(group.endDateTime);
    return now >= start && now <= end;
  }

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

    if (now < start) return 'upcoming';
    if (now > end) return 'completed';
    return 'active';
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
    this.autoScrollIntervals.forEach((interval) => clearInterval(interval));
    this.autoScrollIntervals.clear();
    this.scrollSubscriptions.forEach((sub) => sub.unsubscribe());
    this.scrollSubscriptions.clear();
  }
}