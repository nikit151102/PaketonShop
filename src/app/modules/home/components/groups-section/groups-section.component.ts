import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-groups-section',
  imports: [CommonModule],
  templateUrl: './groups-section.component.html',
  styleUrl: './groups-section.component.scss'
})
export class GroupsSectionComponent {

  showAll = false;
  maxPerRow = 5;

  categories: any = [
    {
      name: 'Одноразовая посуда',
      image: 'https://images.unsplash.com/photo-1556740764-4b6f3f17a353?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Бумажная посуда', slug: 'paper-tableware' },
        { name: 'Пластиковая посуда', slug: 'plastic-tableware' },
        { name: 'Посуда премиум-класса', slug: 'premium-tableware' },
        { name: 'Посуда ВПС', slug: 'vps-tableware' }
      ]
    },
    {
      name: 'Биоразлагаемая посуда',
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Набор тарелок биоразлагаемых', slug: 'biodegradable-plates-set' },
        { name: 'Стаканы', slug: 'cups' },
        { name: 'Столовые приборы', slug: 'cutlery' }
      ]
    },
    {
      name: 'Эко упаковка',
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Эко упаковка для салатов', slug: 'eco-salad-packaging' },
        { name: 'Эко упаковка для сэндвичей и роллов', slug: 'eco-sandwich-rolls-packaging' },
        { name: 'Эко упаковка для супа, лапши', slug: 'eco-soup-noodles-packaging' },
        { name: 'Эко упаковка для бургеров, картофеля фри', slug: 'eco-burger-fries-packaging' },
        { name: 'Бумажный уголок', slug: 'paper-corner' },
        { name: 'Универсальная упаковка', slug: 'universal-packaging' }
      ]
    },
    {
      name: 'Контейнеры',
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Контейнеры полипропиленовые', slug: 'polypropylene-containers' },
        { name: 'Контейнер наборы (фасовка)', slug: 'container-sets' },
        { name: 'Контейнер Комус фасовка', slug: 'komus-containers' },
        { name: 'Контейнер для кондитерских изделий', slug: 'confectionery-containers' }
      ]
    },
    {
      name: 'Коробка для маркетплейсов',
      image: 'https://images.unsplash.com/photo-1542831371-d531d36971e6?auto=format&fit=crop&w=400&q=80',
      subcategories: []
    },
    {
      name: 'Картонная упаковка',
      image: 'https://images.unsplash.com/photo-1582719478147-8e94d6d6e1ff?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Картонная коробка', slug: 'cardboard-box' },
        { name: 'Коробки для хранения', slug: 'storage-boxes' },
        { name: 'Коробки для пиццы', slug: 'pizza-boxes' },
        { name: 'Тубус картонный', slug: 'cardboard-tube' }
      ]
    },
    {
      name: 'Пакеты',
      image: 'https://images.unsplash.com/photo-1562564055-e1a9a15cc3db?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Пакет-майка', slug: 't-shirt-bag' },
        { name: 'Пакеты с вырубной ручкой', slug: 'die-cut-handle-bags' },
        { name: 'Пакеты с петлевой ручкой', slug: 'loop-handle-bags' },
        { name: 'Термопакеты', slug: 'thermal-bags' }
      ]
    },
    {
      name: 'Одноразовая посуда',
      image: 'https://images.unsplash.com/photo-1556740764-4b6f3f17a353?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Бумажная посуда', slug: 'paper-tableware' },
        { name: 'Пластиковая посуда', slug: 'plastic-tableware' },
        { name: 'Посуда премиум-класса', slug: 'premium-tableware' },
        { name: 'Посуда ВПС', slug: 'vps-tableware' }
      ]
    },
    {
      name: 'Биоразлагаемая посуда',
      image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Набор тарелок биоразлагаемых', slug: 'biodegradable-plates-set' },
        { name: 'Стаканы', slug: 'cups' },
        { name: 'Столовые приборы', slug: 'cutlery' }
      ]
    },
    {
      name: 'Эко упаковка',
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Эко упаковка для салатов', slug: 'eco-salad-packaging' },
        { name: 'Эко упаковка для сэндвичей и роллов', slug: 'eco-sandwich-rolls-packaging' },
        { name: 'Эко упаковка для супа, лапши', slug: 'eco-soup-noodles-packaging' },
        { name: 'Эко упаковка для бургеров, картофеля фри', slug: 'eco-burger-fries-packaging' },
        { name: 'Бумажный уголок', slug: 'paper-corner' },
        { name: 'Универсальная упаковка', slug: 'universal-packaging' }
      ]
    },
    {
      name: 'Контейнеры',
      image: 'https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Контейнеры полипропиленовые', slug: 'polypropylene-containers' },
        { name: 'Контейнер наборы (фасовка)', slug: 'container-sets' },
        { name: 'Контейнер Комус фасовка', slug: 'komus-containers' },
        { name: 'Контейнер для кондитерских изделий', slug: 'confectionery-containers' }
      ]
    },
    {
      name: 'Коробка для маркетплейсов',
      image: 'https://images.unsplash.com/photo-1542831371-d531d36971e6?auto=format&fit=crop&w=400&q=80',
      subcategories: []
    },
    {
      name: 'Картонная упаковка',
      image: 'https://images.unsplash.com/photo-1582719478147-8e94d6d6e1ff?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Картонная коробка', slug: 'cardboard-box' },
        { name: 'Коробки для хранения', slug: 'storage-boxes' },
        { name: 'Коробки для пиццы', slug: 'pizza-boxes' },
        { name: 'Тубус картонный', slug: 'cardboard-tube' }
      ]
    },
    {
      name: 'Пакеты',
      image: 'https://images.unsplash.com/photo-1562564055-e1a9a15cc3db?auto=format&fit=crop&w=400&q=80',
      subcategories: [
        { name: 'Пакет-майка', slug: 't-shirt-bag' },
        { name: 'Пакеты с вырубной ручкой', slug: 'die-cut-handle-bags' },
        { name: 'Пакеты с петлевой ручкой', slug: 'loop-handle-bags' },
        { name: 'Термопакеты', slug: 'thermal-bags' }
      ]
    }
  ];

constructor() {
  this.categories.forEach((category: any) => {
    const classes = ['w-small', 'w-medium', 'w-large'];
    const randomIndex = Math.floor(Math.random() * classes.length);
    category.widthClass = classes[randomIndex];
  });
}


  toggleShowAll() {
    this.showAll = !this.showAll;
  }

  get visibleCategories() {
    if (this.showAll) return this.categories;
    return this.categories.slice(0, 2 * this.maxPerRow); // 2 ряда по текущему maxPerRow
  }

getRandomWidthClass(): string {
  const classes = ['w-small', 'w-medium', 'w-large'];
  const randomIndex = Math.floor(Math.random() * classes.length);
  return classes[randomIndex];
}


}
