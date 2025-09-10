import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProductGalleryComponent } from '../../../core/ui/product-gallery/product-gallery.component';
import { ProductsService } from '../../../core/services/products.service';
import { ActivatedRoute } from '@angular/router';

interface Store {
  name: string;
  inStock: boolean;
}

interface ColorOption {
  name: string;
  value: string; // цвет в HEX или css
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductGalleryComponent],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent implements OnInit {

  quantity = 1;
  isDiscount: boolean = true;
  stock = 12;
  oldPrice: number = 150;
  selectedColor: string = '';
  selectedVolume: string = '';
  showStores = false;
  modalTop = 0;
  modalLeft = 0;
  productData: any;

  colors: ColorOption[] = [
    { name: 'Красный', value: '#ff4d4d' },
    { name: 'Синий', value: '#4d6fff' },
    { name: 'Зеленый', value: '#3cd07b' }
  ];

  volumes: string[] = ['250 мл', '500 мл', '1 л'];

  stores: Store[] = [
    { name: 'Магазин на Ленина, 10', inStock: true },
    { name: 'ТРЦ "Солнечный"', inStock: false },
    { name: 'Ул. Победы, 45', inStock: true }
  ];

  @ViewChild('storeCheckBtn') storeCheckBtn!: ElementRef;


  constructor(
    private route: ActivatedRoute,
    private productsService: ProductsService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.loadData(params.get('id')!);
    });

  }

  loadData(id: string) {
    this.productsService.getById(id).subscribe((values: any) => {
      this.productData = values.data;
    });
  }

  copyArticle(): void {
    if (!this.productData.article) return;
    navigator.clipboard.writeText(this.productData.article).then(() => {}).catch(err => {});
  }

  openStores() {
    if (!this.storeCheckBtn) return;
    const rect = this.storeCheckBtn.nativeElement.getBoundingClientRect();
    this.modalTop = rect.bottom + window.scrollY; // под кнопкой
    this.modalLeft = rect.left + window.scrollX;   // по левому краю кнопки
    this.showStores = true;
  }

  addToCart() {
    console.log(`Добавлено в корзину: ${this.quantity} шт. Цвет: ${this.selectedColor}, Объем: ${this.selectedVolume}`);
  }

  selectColor(color: string) {
    this.selectedColor = color;
  }

  selectVolume(vol: string) {
    this.selectedVolume = vol;
  }

  closeStores() {
    this.showStores = false;
  }
}
