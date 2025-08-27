import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-category-section',
  imports: [CommonModule, RouterLink],
  templateUrl: './category-section.component.html',
  styleUrl: './category-section.component.scss'
})
export class CategorySectionComponent {
   categories = [
    { 
      title: 'Пластиковые стаканы', 
      image: 'https://pngimg.com/uploads/plastic_cup/plastic_cup_PNG101.png',
      count: 128,
        subcategories: [
        { name: 'Бумажная посуда', slug: 'paper-tableware' },
        { name: 'Пластиковая посуда', slug: 'plastic-tableware' },
        { name: 'Посуда премиум-класса', slug: 'premium-tableware' },
        { name: 'Посуда ВПС', slug: 'vps-tableware' }
      ]
    },
    { 
      title: 'Кроссовки', 
      image: 'https://pngimg.com/uploads/running_shoes/running_shoes_PNG5826.png',
      count: 96,
        subcategories: [
        { name: 'Бумажная посуда', slug: 'paper-tableware' },
        { name: 'Пластиковая посуда', slug: 'plastic-tableware' },
        { name: 'Посуда премиум-класса', slug: 'premium-tableware' },
        { name: 'Посуда ВПС', slug: 'vps-tableware' }
      ]
    },
    { 
      title: 'Сумки', 
      image: 'https://pngimg.com/uploads/bag/bag_PNG4830.png',
      count: 54 
    },
    { 
      title: 'Наушники', 
      image: 'https://pngimg.com/uploads/headphones/headphones_PNG7659.png',
      count: 210 
    }
  ];

}

