// empty-state.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterModule } from '@angular/router';

export type EmptyStateType = 'favorites' | 'cart' | 'search' | 'orders' | 'partner' | 'addresses' | 'tk' | 'custom';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss']
})
export class EmptyStateComponent {
  @Input() type: EmptyStateType = 'custom';
  @Input() title: string = 'Здесь пока пусто';
  @Input() text: string = '';
  @Input() imageUrl: string = '';
  @Input() buttonText: string = 'Перейти в каталог';
  @Input() buttonLink: string = '';
  @Input() showButton: boolean = true;
  @Input() customClass: string = '';

  @Output() buttonClick = new EventEmitter<void>();

  private typeConfigs = {
    favorites: {
      title: 'В избранном пока пусто',
      text: 'Добавляйте товары в избранное, и они появятся в этом разделе',
      imageUrl: 'paketoshka/favourites.png',
      buttonText: 'Перейти в каталог',
      buttonLink: ''
    },
    cart: {
      title: 'Корзина пуста',
      text: 'Добавьте товары в корзину, чтобы оформить заказ',
      imageUrl: 'paketoshka/empty-cart.png',
      buttonText: 'Начать покупки',
      buttonLink: ''
    },
    search: {
      title: 'Ничего не найдено',
      text: 'Попробуйте изменить параметры поиска',
      imageUrl: 'paketoshka/no-results.png',
      buttonText: 'Сбросить фильтры',
      buttonLink: ''
    },
    orders: {
      title: 'У вас пока нет заказов',
      text: 'Ознакомьтесь с нашим каталогом и сделайте первый заказ',
      imageUrl: 'paketoshka/empty-cart.png',
      buttonText: 'Перейти в каталог',
      buttonLink: ''
    },
    partner: {
      title: 'У вас пока нет компаний',
      text: 'Добавьте первую компанию, чтобы начать работу',
      imageUrl: 'paketoshka/business.png',
      buttonText: ' Добавить компанию',
      buttonLink: ''
    },
    addresses: {
      title: 'У вас пока нет личных адресов',
      text: 'Добавьте свой первый адрес доставки',
      imageUrl: 'paketoshka/addresses.png',
      buttonText: 'Добавить адрес',
      buttonLink: ''
    },
    tk: {
      title: 'У вас пока нет пунктов выдачи',
      text: 'Добавьте пункты выдачи транспортных компаний',
      imageUrl: 'paketoshka/tk.png',
      buttonText: 'Добавить адрес',
      buttonLink: ''
    }
  };

  ngOnInit() {
    this.applyTypeConfig();
  }

  private applyTypeConfig() {
    if (this.type !== 'custom' && this.typeConfigs[this.type]) {
      const config = this.typeConfigs[this.type];
      this.title = this.title === 'Здесь пока пусто' ? config.title : this.title;
      this.text = this.text || config.text;
      this.imageUrl = this.imageUrl || config.imageUrl;
      this.buttonText = this.buttonText === 'Перейти в каталог' ? config.buttonText : this.buttonText;
      this.buttonLink = this.buttonLink || config.buttonLink;
    }
  }

  onButtonClick() {
    this.buttonClick.emit();
  }
}