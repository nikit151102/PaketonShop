import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-category-section',
  imports: [CommonModule, RouterLink],
  templateUrl: './category-section.component.html',
  styleUrl: './category-section.component.scss',
})
export class CategorySectionComponent implements OnChanges {
  @Input() categories: any[] = [];
  displayedCategories: any[] = [];
  showAllCategories: boolean = false;
  isMainPage: boolean = false;

  constructor(private router: Router) { }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categories'] && changes['categories'].currentValue) {
      this.updateDisplayedCategories();
    }
  }

  ngOnInit() {
    this.isMainPage = this.router.url === '/';
    if (this.categories) {
      this.updateDisplayedCategories();
    }
  }

  updateDisplayedCategories() {
    if (!this.categories || !Array.isArray(this.categories)) {
      this.displayedCategories = [];
      return;
    }

    if (this.isMainPage) {
      const maxCategories = this.showAllCategories ? this.categories.length : 12;
      const categoriesToShow = this.categories.slice(0, maxCategories);
      
      this.displayedCategories = categoriesToShow.map((category, index) => {
        if (!category) return null;
        
        return {
          ...category,
          showTags: category.subCategories?.length > 0,
          index
        };
      }).filter(Boolean);
    } else {
      this.displayedCategories = this.categories.map((category, index) => {
        if (!category) return null;
        
        return {
          ...category,
          showTags: true,
          index
        };
      }).filter(Boolean);
    }
  }

  toggleDisplay() {
    this.showAllCategories = !this.showAllCategories;
    this.updateDisplayedCategories();
  }
}