import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductComponent } from '../../core/components/product/product.component';
import { ViewSwitcherComponent } from '../../core/ui/view-switcher/view-switcher.component';

@Component({
  selector: 'app-products',
  imports: [CommonModule, ProductComponent, ViewSwitcherComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {

  popularProducts = [
    {
      id: 1,
      title: 'Стакан бумажный БИОразлагаемый Кофе 250мл',
      image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
      price: 50,
      oldPrice: 65,
      badge: 'Хит',
      badgeType: 'hit',
      qty: 1,
      stock: 120,
      perPack: 50,
      rating: 4.8,
      reviews: 34,
      favorite: false,
      compare: false
    },
    {
      id: 2,
      title: 'Стакан бумажный БИОразлагаемый Черный 350мл',
      image: 'https://пакетон.рф/thumb/2/gY67umA3qwRalmook9HBZw/300r270/d/bumazhnyj_stakan_350_ml_787541.jpg',
      price: 7490,
      oldPrice: null,
      badge: 'Новинка',
      badgeType: 'new',
      qty: 1,
      stock: 45,
      perPack: 25,
      rating: 4.6,
      reviews: 18,
      favorite: false,
      compare: false
    },
    {
      id: 3,
      title: 'Н-р тарелка БИОРАЗЛАГАЕМАЯ с пшеничной соломой d-225мм',
      image: 'https://пакетон.рф/thumb/2/TufqP6Qm6b8i-xeIv3bHKg/300r270/d/izobrazhenie_whatsapp_2025-03-04_v_1336-photoroom_1.jpg',
      price: 1990,
      oldPrice: 2490,
      badge: '-20%',
      badgeType: 'sale',
      qty: 1,
      stock: 200,
      perPack: 10,
      rating: 4.9,
      reviews: 51,
      favorite: false,
      compare: false
    },
    {
      id: 4,
      title: 'Стакан бумажный БИОразлагаемый Кофе 250мл',
      image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
      price: 50,
      oldPrice: null,
      badge: '🔥 Топ',
      badgeType: 'top',
      qty: 1,
      stock: 300,
      perPack: 100,
      rating: 4.7,
      reviews: 67,
      favorite: false,
      compare: false
    },
    {
      id: 5,
      title: 'Стакан бумажный БИОразлагаемый Черный 350мл',
      image: 'https://пакетон.рф/thumb/2/gY67umA3qwRalmook9HBZw/300r270/d/bumazhnyj_stakan_350_ml_787541.jpg',
      price: 7490,
      oldPrice: 8200,
      badge: 'Хит',
      badgeType: 'hit',
      qty: 1,
      stock: 75,
      perPack: 25,
      rating: 4.5,
      reviews: 24,
      favorite: false,
      compare: false
    },
    {
      id: 6,
      title: 'Н-р тарелка БИОРАЗЛАГАЕМАЯ с пшеничной соломой d-225мм',
      image: 'https://пакетон.рф/thumb/2/TufqP6Qm6b8i-xeIv3bHKg/300r270/d/izobrazhenie_whatsapp_2025-03-04_v_1336-photoroom_1.jpg',
      price: 1990,
      oldPrice: 2390,
      badge: 'Скидка',
      badgeType: 'sale',
      qty: 1,
      stock: 150,
      perPack: 20,
      rating: 4.4,
      reviews: 13,
      favorite: false,
      compare: false
    }
  ];

  currentView: 'compact' | 'wide' = 'compact';

  setView(view: 'compact' | 'wide') {
    this.currentView = view;
  }
}
