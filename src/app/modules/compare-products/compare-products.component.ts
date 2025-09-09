import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

interface Product {
  id: number;
  name: string;
  image: string;
  description: string;
  price: number;
  features: { [key: string]: string };
}

@Component({
  selector: 'app-compare-products',
  imports: [CommonModule],
  templateUrl: './compare-products.component.html',
  styleUrl: './compare-products.component.scss'
})
export class CompareProductsComponent {
  products: Product[] = [
    {
      id: 1,
      name: 'Бумажный стакан 250 мл',
      image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
      description: 'Идеален для холодных напитков',
      price: 1.5,
      features: {
        'Объем': '250 мл',
        'Материал': 'Бумага',
        'Высота': '10 см',
        'Диаметр': '7 см',
      }
    },
    {
      id: 2,
      name: 'Бумажный стакан 500 мл',
      image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
      description: 'Подходит для горячих и холодных напитков',
      price: 2.0,
      features: {
        'Объем': '500 мл',
        'Материал': 'Бумага',
        'Высота': '12 см',
        'Диаметр': '8 см',
      }
    },
    {
      id: 3,
      name: 'Бумажный стакан 1000 мл',
      image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
      description: 'Большой стакан для напитков',
      price: 3.5,
      features: {
        'Объем': '1000 мл',
        'Материал': 'Бумага',
        'Высота': '15 см',
        'Диаметр': '9 см',
      }
    },
    {
      id: 4,
      name: 'Бумажный стакан 300 мл',
      image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
      description: 'Подходит для кофе и чая',
      price: 2.2,
      features: {
        'Объем': '300 мл',
        'Материал': 'Бумага',
        'Высота': '11 см',
        'Диаметр': '7 см',
      }
    },
    {
      id: 5,
      name: 'Бумажный стакан 700 мл',
      image: 'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png',
      description: 'Для крупных напитков',
      price: 3.0,
      features: {
        'Объем': '700 мл',
        'Материал': 'Бумага',
        'Высота': '14 см',
        'Диаметр': '8 см',
      }
    },
  ];
}
