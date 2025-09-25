import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-category-section',
  imports: [CommonModule, RouterLink],
  templateUrl: './category-section.component.html',
  styleUrl: './category-section.component.scss'
})
export class CategorySectionComponent implements OnChanges {
  
  @Input() categories: any[] = [];  // входящий массив категорий
  displayedCategories: any[] = [];   // категории, которые будут отображаться
  showAllCategories: boolean = false;  // флаг для кнопки "Еще"
  isMainPage: boolean = false;  // флаг для проверки, на главной ли мы странице

  constructor(private router: Router) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categories']) {
      this.updateDisplayedCategories();
    }
  }

  ngOnInit() {
    this.isMainPage = this.router.url === '/';
    this.updateDisplayedCategories();
  }

  updateDisplayedCategories() {
    if (this.isMainPage) {
      // На главной странице показываем только 2 строки по 5 категорий (10 карточек)
      this.displayedCategories = this.categories.slice(0, this.showAllCategories ? this.categories.length : 10);
    } else {
      // Для других страниц показываем все категории
      this.displayedCategories = this.categories;
    }
  }

  toggleDisplay() {
    this.showAllCategories = !this.showAllCategories;
    this.updateDisplayedCategories();
  }
}
