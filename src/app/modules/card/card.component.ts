import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ProductCardComponent } from './product-card/product-card.component';

@Component({
  selector: 'app-card',
  imports: [CommonModule, ProductCardComponent],
  templateUrl: './card.component.html',
  styleUrl: './card.component.scss'
})
export class CardComponent {

  activeTab: 'description' | 'features' | 'reviews' = 'description';

  setTab(tab: 'description' | 'features' | 'reviews') {
    this.activeTab = tab;
  }

}