import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductComponent } from './product/product.component';
import { SelectCartButtonComponent } from './select-cart-button/select-cart-button.component';
import { BasketsService } from '../../core/api/baskets.service';
import { UserBasket, CreateBasketDto } from '../../../models/baskets.interface';
import { DeliveryOrderService } from '../../core/api/delivery-order.service';

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  imports: [
    CommonModule,
    FormsModule,
    ProductComponent,
    SelectCartButtonComponent,
  ],
})
export class CartComponent implements OnInit {
  baskets: any[] = [];
  activeBasket: any = null;
  isPopupOpen = false;
  newBasketName = '';
  selectedProducts: Set<string> = new Set();

  constructor(
    private basketsService: BasketsService,
    private deliveryOrderService: DeliveryOrderService,
    public router: Router,
  ) { }

  ngOnInit(): void {
    this.loadBaskets();
  }

  loadBaskets(): void {
    this.basketsService
      .filterBaskets({
        filters: [],
        sorts: [],
        page: 0,
        pageSize: 10,
      })
      .subscribe({
        next: (res) => {
          this.baskets = res.data;

          // Найти активную корзину
          this.activeBasket = this.baskets.find(
            (basket: any) => basket.isActiveBasket === true
          );

          // Если активной корзины нет, взять первую
          if (!this.activeBasket && this.baskets.length > 0) {
            this.activeBasket = this.baskets[0];
          }

          // Загрузить полную информацию об активной корзине
          if (this.activeBasket) {
            this.selectBasket(this.activeBasket);
          }
        },
        error: (err) => console.error('Ошибка загрузки корзин', err),
      });
  }

  selectBasket(basket: UserBasket): void {
    this.basketsService.getBasketById(basket.id).subscribe({
      next: (value: any) => {
        this.activeBasket = value.data;
        this.selectedProducts.clear();
      },
      error: (err) => console.error('Ошибка загрузки корзины', err)
    });
  }

  openCreatePopup(): void {
    this.isPopupOpen = true;
    this.newBasketName = '';
  }

  closePopup(): void {
    this.isPopupOpen = false;
  }

  confirmCreateBasket(): void {
    const name = this.newBasketName.trim();
    if (!name) return;

    const dto: CreateBasketDto = {
      name,
      products: [],
    };

    this.basketsService.createBasket(dto).subscribe({
      next: (res) => {
        this.baskets.push(res.data);
        this.activeBasket = res.data;
        this.closePopup();
      },
      error: (err) => console.error('Ошибка создания корзины', err),
    });
  }

  isSelected(id: string): boolean {
    return this.selectedProducts.has(id);
  }

  onProductSelected(event: { id: string; selected: boolean }): void {
    if (event.selected) {
      this.selectedProducts.add(event.id);
    } else {
      this.selectedProducts.delete(event.id);
    }
  }

  removeSelectedProducts(): void {
    if (this.selectedProducts.size === 0) return;

    const productIds = Array.from(this.selectedProducts);

    // TODO: Добавить API вызов для удаления
    console.log('Удаление товаров:', productIds);

    if (this.activeBasket?.products) {
      this.activeBasket.products = this.activeBasket.products.filter(
        (p: any) => !productIds.includes(p.id)
      );
    }

    this.selectedProducts.clear();
  }

  onQuantityChange(event: any): void {
    if (!this.activeBasket?.products) return;

    const product = this.activeBasket.products.find((p: any) => p.id === event.id);
    if (product) {
      product.qty = event.quantity;

      // TODO: Добавить API обновления количества
      console.log(`Изменено количество товара ${product.name}: ${event.quantity}`);
    }
  }

  onProductRemove(id: string): void {
    if (!this.activeBasket?.products) return;

    this.activeBasket.products = this.activeBasket.products.filter(
      (p: any) => p.id !== id
    );

    this.selectedProducts.delete(id);

    // TODO: Добавить API удаления товара
    console.log(`Удален товар с ID: ${id}`);
  }

  calculateTotal(): number {
    if (!this.activeBasket?.products) return 0;

    return this.activeBasket.products.reduce(
      (total: number, product: any) => total + (product.price * product.qty),
      0
    );
  }

  canProceedToCheckout(): boolean {
    return this.activeBasket?.products?.length > 0;
  }

  proceedToCheckout(): void {
    if (!this.canProceedToCheckout()) {
      alert('Добавьте товары в корзину для оформления заказа');
      return;
    }
    
    const productPositionIds = this.activeBasket.products.map((product:any) => product.id);

    this.deliveryOrderService.createOrder({
      'userBasketId': this.activeBasket.id,
      'orderStatus': 0,
      'productPositionIds': productPositionIds
    }).subscribe((response: any) => {
      this.router.navigate(['/order', response.data.id]);
    });
  }

  trackByProductId(index: number, item: any): string {
    return item.id;
  }
}