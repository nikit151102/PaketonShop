import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-popular-products',
  imports: [CommonModule, FormsModule],
  templateUrl: './popular-products.component.html',
  styleUrl: './popular-products.component.scss'
})
export class PopularProductsComponent {
popularProducts = [
  {
    id: 1,
    title: 'Стакан бумажный БИОразлагаемый Кофе 250мл',
    image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
    price: 50,
    badge: 'Хит',
    badgeType: 'hit',
    qty: 1
  },
  {
    id: 2,
    title: 'Стакан бумажный БИОразлагаемый Черный 350мл',
    image: 'https://пакетон.рф/thumb/2/gY67umA3qwRalmook9HBZw/300r270/d/bumazhnyj_stakan_350_ml_787541.jpg',
    price: 7490,
    badge: 'Новинка',
    badgeType: 'new',
    qty: 1
  },
  {
    id: 3,
    title: 'Н-р тарелка БИОРАЗЛАГАЕМАЯ с пшеничной соломой d-225мм',
    image: 'https://пакетон.рф/thumb/2/TufqP6Qm6b8i-xeIv3bHKg/300r270/d/izobrazhenie_whatsapp_2025-03-04_v_1336-photoroom_1.jpg',
    price: 1990,
    badge: '-20%',
    badgeType: 'sale',
    qty: 1
  },
    {
    id: 1,
    title: 'Стакан бумажный БИОразлагаемый Кофе 250мл',
    image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
    price: 50,
    badge: '🔥 Топ',
    badgeType: 'top',
    qty: 1
  },
  {
    id: 2,
    title: 'Стакан бумажный БИОразлагаемый Черный 350мл',
    image: 'https://пакетон.рф/thumb/2/gY67umA3qwRalmook9HBZw/300r270/d/bumazhnyj_stakan_350_ml_787541.jpg',
    price: 7490,
    badge: 'Хит',
    badgeType: 'hit',
    qty: 1
  },
  {
    id: 3,
    title: 'Н-р тарелка БИОРАЗЛАГАЕМАЯ с пшеничной соломой d-225мм',
    image: 'https://пакетон.рф/thumb/2/TufqP6Qm6b8i-xeIv3bHKg/300r270/d/izobrazhenie_whatsapp_2025-03-04_v_1336-photoroom_1.jpg',
    price: 1990,
    badge: 'Скидка',
    badgeType: 'sale',
    qty: 1
  }
];

  increaseQty(product: any) {
    product.qty++;
  }

  decreaseQty(product: any) {
    if (product.qty > 1) {
      product.qty--;
    }
  }
  
}
