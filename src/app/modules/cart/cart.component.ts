import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductComponent } from './product/product.component';
import { SummaryComponent } from './summary/summary.component';
import { SelectCartButtonComponent } from './select-cart-button/select-cart-button.component';
import { OrderFormComponent } from './order-form/order-form.component';
import { BasketsService } from '../../core/api/baskets.service';
import { UserBasket, CreateBasketDto } from '../../../models/baskets.interface';
import { Router } from '@angular/router';

interface RelatedProduct {
  id: number;
  name: string;
  price: number;
  image: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  qty: number;
  image: string;
  sku: string;
  description?: string;
  rating?: number;
  reviews?: number;
  available?: boolean;
  related?: RelatedProduct[];
}

interface Company {
  id: number;
  name: string;
  inn: string;
}

@Component({
  selector: 'app-cart',
  standalone: true,
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  imports: [CommonModule, FormsModule, ProductComponent, SummaryComponent, SelectCartButtonComponent, OrderFormComponent]
})
export class CartComponent implements OnInit {

  products: Product[] = [
    {
      id: 1,
      name: 'Коробка 30x30',
      price: 120,
      qty: 1,
      image: 'https://пакетон.рф/thumb/2/hAwNJ5J_pr3fi4-H37Px6A/540r540/d/cml_a8e0d1c6_8067abcf.jpg',
      sku: 'BOX3030',
      description: 'Прочная картонная коробка 30x30 см',
      rating: 5,
      reviews: 12,
      available: true,
      related: [
        { id: 101, name: 'Скотч упаковочный', price: 50, image: 'https://пакетон.рф/thumb/2/hAwNJ5J_pr3fi4-H37Px6A/540r540/d/cml_a8e0d1c6_8067abcf.jpg' },
        { id: 102, name: 'Маркер для коробок', price: 30, image: 'https://пакетон.рф/thumb/2/hAwNJ5J_pr3fi4-H37Px6A/540r540/d/cml_a8e0d1c6_8067abcf.jpg' }
      ]
    },
    {
      id: 2,
      name: 'Пакет крафт',
      price: 25,
      qty: 5,
      image: 'https://пакетон.рф/thumb/2/6rZWC4RqWAnaMgOpUUrfCg/300r270/d/naou8el7bwamebraq0ek0atcpygv9nbt.jpg',
      sku: 'KRAFT001',
      description: 'Крафт пакет с крученными ручками',
      rating: 4,
      reviews: 8,
      available: true
    }
  ];

  baskets: any;
  activeBasket: any;

  constructor(private basketsService: BasketsService, public router: Router) { }

  ngOnInit(): void {
    this.loadBaskets();
  }


  /**
   * Загрузить корзины пользователя
   */
  loadBaskets(): void {
    this.basketsService
      .filterBaskets({
        filters: [],
        sorts: [],
        page: 0,
        pageSize: 10
      })
      .subscribe({
        next: (res) => {
          this.baskets = res.data;
          this.activeBasket = this.baskets[0] || undefined;
        },
        error: (err) => console.error('Ошибка загрузки корзин', err)
      });
  }

  /**
   * Выбор активной корзины
   */
  selectBasket(basket: UserBasket): void {
    this.basketsService.getBasketById(basket.id).subscribe((value: any) => {
      this.activeBasket = value.data;
    })
  }

  isPopupOpen = false;
  newBasketName = '';

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
      products: []
    };

    this.basketsService.createBasket(dto).subscribe({
      next: (res) => {
        this.baskets.push(res.data);
        this.activeBasket = res.data;
        this.closePopup();
      },
      error: (err) => console.error('Ошибка создания корзины', err)
    });
  }


  // Метод добавления сопутствующего товара в корзину
  addRelatedToCart(item: RelatedProduct) {
    const existing = this.products.find(p => p.id === item.id);
    if (existing) {
      existing.qty += 1;
    } else {
      this.products.push({ ...item, qty: 1, sku: 'REL-' + item.id });
    }
  }

  companies: Company[] = [
    { id: 1, name: 'ООО "Пример"', inn: '0000000000' },
    { id: 2, name: 'ООО "Логистика"', inn: '0000000000' }
  ];

  // Форма
  formData = {
    lastName: '',
    firstName: '',
    middleName: '',
    phone: '',
    email: '',
    info: '',
    needConsult: false,
    agreement: false,
    personType: 'fiz',
    delivery: 'pickup'
  };

  // Методы управления корзиной
  addCompany() {
    this.companies.push({ id: Date.now(), name: 'Новая компания', inn: '00000000000' });
  }



  toggleWishlist(product: Product) {
    // можно добавить флаг, например product.wishlist = !product.wishlist
    console.log(`Товар "${product.name}" добавлен в wishlist`);
  }

  selectedProducts: Set<string> = new Set();

  // Проверка для передачи в [selected]
  isSelected(id: string) {
    return this.selectedProducts.has(id);
  }

  // Отслеживание изменения чекбокса
  onProductSelected(event: { id: string; selected: boolean }) {
    if (event.selected) {
      this.selectedProducts.add(event.id);
    } else {
      this.selectedProducts.delete(event.id);
    }

    console.log('Выбранные товары:', Array.from(this.selectedProducts));
  }

}
