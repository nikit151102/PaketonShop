import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { forkJoin } from 'rxjs'; // Импортируем forkJoin для параллельных запросов
import { ProductComponent } from '../../../../core/components/product/product.component';
import { PromoOrderGroupService } from '../../../../core/api/promo-order-group.service';
import { PromoOrderService } from '../../../../core/api/promo-order.service'; // Импортируем новый сервис
import { PromoOrderGroup } from '../../../../core/interfaces/promo.interface';

@Component({
  selector: 'app-sales-products',
  imports: [CommonModule, ProductComponent],
  templateUrl: './sales-products.component.html',
  styleUrl: './sales-products.component.scss',
})
export class SalesProductsComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('productsGrid') productsGrid!: ElementRef;

  promoGroups: PromoOrderGroup[] = [];
  isLoading = true;

  private scrollInterval: any;
  private cardWidth = 0;
  private userScrolled = false;
  private scrollTimeout: any;

  private promoOrderGroupService = inject(PromoOrderGroupService);
  private promoOrderService = inject(PromoOrderService);

  ngOnInit(): void {
    this.loadPromoGroups();
  }

  ngAfterViewInit(): void {
    this.initScroll();
  }

  private loadPromoGroups(): void {
    this.isLoading = true;

    this.promoOrderGroupService
      .getPromoGroupsWithProducts(0, 10)
      .subscribe({
        next: (groups) => {
          if (!groups || groups.length === 0) {
            this.promoGroups = [];
            this.isLoading = false;
            return;
          }

          // Создаем массив Observable для получения деталей по каждой группе
          const detailedRequests = groups.map(group => 
            // ⚠️ Убедитесь, что идентификатор группы хранится в поле `id`. 
            // Если он называется иначе (например, `promoGroupId` или `code`), замените `group.id`
            this.promoOrderService.getPromoOrderById(group.id) 
          );

          // Выполняем все запросы параллельно
          forkJoin(detailedRequests).subscribe({
            next: (detailedData) => {
              // Объединяем базовые данные групп с полученными подробными данными
              this.promoGroups = groups.map((group, index) => ({
                ...group,
                ...detailedData[index] // Перезаписываем или дополняем объект группы
              }));
              
              console.log('Группы с подробными данными:', this.promoGroups);
              this.isLoading = false;
              
              // После загрузки пересчитываем ширину карточки
              setTimeout(() => this.updateCardWidth(), 100);
            },
            error: (err) => {
              console.error('Ошибка загрузки подробных данных акций:', err);
              // В случае ошибки загрузки деталей оставляем хотя бы базовые группы
              this.promoGroups = groups;
              this.isLoading = false;
              setTimeout(() => this.updateCardWidth(), 100);
            },
          });
        },
        error: (err) => {
          console.error('Ошибка загрузки списка акций:', err);
          this.isLoading = false;
        },
      });
  }

  private initScroll(): void {
    const container = this.productsGrid?.nativeElement as HTMLElement;
    if (!container) return;

    this.updateCardWidth();

    container.addEventListener('scroll', () => {
      this.userScrolled = true;
      if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
      this.scrollTimeout = setTimeout(() => {
        this.userScrolled = false;
      }, 3000);
    });

    this.scrollInterval = setInterval(() => this.autoScroll(), 3000);
  }

  private updateCardWidth(): void {
    const container = this.productsGrid?.nativeElement as HTMLElement;
    const card = container?.querySelector('.product-card') as HTMLElement;
    if (container && card) {
      const style = getComputedStyle(card);
      const margin = parseFloat(style.marginLeft) + parseFloat(style.marginRight);
      this.cardWidth = card.offsetWidth + margin;
    }
  }

  autoScroll(): void {
    if (this.userScrolled) return;

    const container = this.productsGrid?.nativeElement as HTMLElement;
    if (!container || !this.cardWidth) return;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    if (container.scrollLeft + this.cardWidth >= maxScrollLeft - 1) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: this.cardWidth, behavior: 'smooth' });
    }
  }

  scrollLeft(): void {
    const container = this.productsGrid?.nativeElement as HTMLElement;
    if (container) {
      container.scrollBy({ left: -this.cardWidth, behavior: 'smooth' });
      this.markUserScroll();
    }
  }

  scrollRight(): void {
    const container = this.productsGrid?.nativeElement as HTMLElement;
    if (container) {
      container.scrollBy({ left: this.cardWidth, behavior: 'smooth' });
      this.markUserScroll();
    }
  }

  private markUserScroll(): void {
    this.userScrolled = true;
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.userScrolled = false;
    }, 3000);
  }

  // Форматирование даты для отображения
  formatGroupDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  // Проверка, активна ли группа сейчас
  isGroupActive(group: PromoOrderGroup): boolean {
    const now = new Date();
    const start = new Date(group.beginDateTime);
    const end = new Date(group.endDateTime);
    return now >= start && now <= end;
  }

  ngOnDestroy(): void {
    if (this.scrollInterval) clearInterval(this.scrollInterval);
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
  }
}