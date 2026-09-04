import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface PromoTag {
  tagAbb?: string;
  salePercent?: number;
  tagColor?: string;
  productCountSailLimit?: number;
  productCountAlreadySailed?: number;
}

@Component({
  selector: 'app-product-gallery',
  imports: [CommonModule],
  templateUrl: './product-gallery.component.html',
  styleUrl: './product-gallery.component.scss',
  animations: [
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.95)'  })),
      ]),
    ])
  ],
})
export class ProductGalleryComponent {
  @Input() images: string[] = [];
  @Input() promoTag?: PromoTag | null;
  
  currentImageIndex = 0;

  nextImage() {
    this.currentImageIndex = (this.currentImageIndex + 1) % this.images.length;
  }

  prevImage() {
    this.currentImageIndex =
      (this.currentImageIndex - 1 + this.images.length) % this.images.length;
  }

  goToImage(index: number) {
    this.currentImageIndex = index;
  }
  
  getLimitPercent(): number {
    if (!this.promoTag?.productCountSailLimit || this.promoTag.productCountSailLimit <= 0) return 0;
    const sold = this.promoTag.productCountAlreadySailed || 0;
    const limit = this.promoTag.productCountSailLimit;
    return Math.min((sold / limit) * 100, 100);
  }
  
  getTagColor(): string {
    const colorMap: Record<string, string> = {
      'test': '#8b5cf6',
      'sale': '#ef4444',
      'new': '#10b981',
      'hit': '#f59e0b',
      'promo': '#3b82f6',
    };
    const key = this.promoTag?.tagColor?.toLowerCase();
    return (key && colorMap[key]) || '#ef4444'; 
  }
}