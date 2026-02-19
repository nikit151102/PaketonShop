import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges, HostListener, NgZone } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-category-section',
  imports: [CommonModule, RouterLink],
  templateUrl: './category-section.component.html',
  styleUrl: './category-section.component.scss',
})
export class CategorySectionComponent implements OnInit, OnChanges {
  @Input() categories: any[] = [];

  displayedCategories: any[] = [];
  showAllCategories: boolean = false;
  isMainPage: boolean = false;
  hasMoreCategories: boolean = false;
  hiddenCategoriesCount: number = 0;

  private itemsPerRow: number = 6;
  private resizeTimeout: any;
  private isMobile: boolean = false;
  
  constructor(
    private router: Router,
    private ngZone: NgZone
  ) { }

  ngOnInit() {
    this.isMainPage = this.router.url === '/';
    this.checkMobile();
    this.calculateItemsPerRow();
    this.updateDisplay();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['categories']) {
      this.updateDisplay();
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    
    this.resizeTimeout = setTimeout(() => {
      this.ngZone.run(() => {
        this.checkMobile();
        this.calculateItemsPerRow();
        this.updateDisplay();
      });
    }, 150);
  }

  private checkMobile() {
    this.isMobile = window.innerWidth <= 768;
  }

  private calculateItemsPerRow() {
    const width = window.innerWidth;

    if (width >= 1200) {
      this.itemsPerRow = 8;
    } else if (width >= 992) {
      this.itemsPerRow = 5;
    } else if (width >= 768) {
      this.itemsPerRow = 4;
    } else if (width >= 576) {
      this.itemsPerRow = 3;
    } else {
      this.itemsPerRow = 2;
    }
  }

  private updateDisplay() {
    if (!this.categories || !Array.isArray(this.categories)) {
      this.displayedCategories = [];
      return;
    }

    if (this.isMainPage && !this.showAllCategories) {
      const itemsFor2FullRows = this.itemsPerRow * 2;
      const partialRowItems = Math.ceil(this.itemsPerRow * 0.4);
      const maxVisibleItems = itemsFor2FullRows + partialRowItems;

      const limitedCategories = this.categories.slice(0, maxVisibleItems);

      const totalItems = limitedCategories.length;
      const itemsInLastRow = totalItems % this.itemsPerRow;

      if (itemsInLastRow > 0 && itemsInLastRow < partialRowItems) {
        const neededItems = partialRowItems - itemsInLastRow;
        const additionalItems = this.categories.slice(totalItems, totalItems + neededItems);
        limitedCategories.push(...additionalItems);
      }

      this.displayedCategories = limitedCategories.map((category, index) => ({
        ...category,
        showSubcategories: false,
        index
      }));

      const totalDisplayed = limitedCategories.length;
      this.hasMoreCategories = this.categories.length > totalDisplayed;
      this.hiddenCategoriesCount = Math.max(0, this.categories.length - totalDisplayed);

    } else {
  
      this.displayedCategories = this.categories.map((category, index) => ({
        ...category,
        showSubcategories: true,
        index
      }));

      this.hasMoreCategories = false;
      this.hiddenCategoriesCount = 0;
    }
  }

  toggleDisplay() {
    this.showAllCategories = !this.showAllCategories;
    this.updateDisplay();

    if (!this.showAllCategories) {
      setTimeout(() => {
        this.scrollToSection();
      }, 200);
    }
  }

  private scrollToSection() {
    const element = document.querySelector('.category-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  getFirstImage(imageString: string): string {
    if (!imageString) return '';

    if (imageString.includes(';')) {
      const images = imageString.split(';').map(img => img.trim());
      return images[0] || '';
    }

    return imageString;
  }

  trackByCategory(index: number, category: any): number {
    return category.id || index;
  }
}