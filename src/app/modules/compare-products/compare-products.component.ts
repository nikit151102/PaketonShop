import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ComparingService } from '../../core/api/comparing.service';
import { Subject, takeUntil } from 'rxjs';

interface ProductProperty {
  id: string;
  value: string;
  productPropertyId: string;
  productInstanceId: string;
  propertyName: string;
  measurementUnitName: string;
  filterType: number;
}

interface PromoOrder {
  id: string;
  salePercent: number;
  isRecountNeed: boolean;
  productId: string;
  promoOrderGroupId: string;
  promoOrderGroup: {
    id: string;
    beginDateTime: string;
    endDateTime: string;
    description: string;
  };
}

interface Product {
  id: string;
  idFrom1C: string;
  nameFrom1C: string;
  article: string;
  shortName: string;
  fullName: string;
  viewPriceSale: number;
  viewPrice: number;
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  mainProductCategoryId: string;
  productImageLinks: string[];
  isFavorite: boolean;
  countInActiveBasket: number;
  productProperties: ProductProperty[];
  promoOrders: PromoOrder[];
}

interface CategoryProperty {
  id: string;
  fullName: string;
  description: string;
  measurementUnitId: string;
  measurementUnitName: string;
  filterType: number;
}

interface ComparisonCategory {
  productCategory: {
    id: string;
    name: string;
  };
  products: Product[];
  properties: CategoryProperty[];
}

interface FilterRequest {
  field: string;
  values: string[];
  type: number;
}

interface SortRequest {
  field: string;
  direction: string;
}

@Component({
  selector: 'app-compare-products',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './compare-products.component.html',
  styleUrl: './compare-products.component.scss',
})
export class CompareProductsComponent implements OnInit, OnDestroy {
  comparisonData: ComparisonCategory[] = [];
  selectedCategory: ComparisonCategory | null = null;
  selectedCategoryIndex: number = 0;
  isLoading: boolean = true;
  errorMessage: string = '';
  hasData: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(private comparingService: ComparingService) {}

  ngOnInit(): void {
    this.loadComparisonData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadComparisonData(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.hasData = false;
    
    const filters: FilterRequest[] = [];
    const sorts: SortRequest[] = [];
    const page = 0;
    const pageSize = 20;
    
    this.comparingService.getComparing(filters, page, pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Ответ от бэкенда:', response);
          
          // Проверяем разные возможные структуры ответа
          if (response && Array.isArray(response)) {
            this.comparisonData = response;
          } else if (response?.data && Array.isArray(response.data)) {
            this.comparisonData = response.data;
          } else if (response?.result && Array.isArray(response.result)) {
            this.comparisonData = response.result;
          } else {
            console.warn('Неожиданная структура ответа:', response);
            this.comparisonData = [];
          }
          
          this.hasData = this.comparisonData.length > 0;
          
          if (this.hasData) {
            this.selectedCategory = this.comparisonData[0];
            console.log('Загружено категорий:', this.comparisonData.length);
            console.log('Первая категория:', this.selectedCategory);
          } else {
            console.warn('Нет данных для сравнения');
            this.loadMockData(); // Загружаем мок-данные для демонстрации
          }
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Ошибка загрузки данных сравнения:', error);
          this.errorMessage = 'Не удалось загрузить данные для сравнения';
          this.isLoading = false;
          this.loadMockData(); // Загружаем мок-данные при ошибке
        }
      });
  }

  selectCategory(category: ComparisonCategory, index: number): void {
    this.selectedCategory = category;
    this.selectedCategoryIndex = index;
    console.log('Выбрана категория:', category.productCategory.name);
  }

  getProductPropertyValue(product: Product, propertyName: string): string {
    if (!product.productProperties || !Array.isArray(product.productProperties)) {
      return '—';
    }
    
    const property = product.productProperties.find(
      prop => prop.propertyName?.toLowerCase() === propertyName.toLowerCase()
    );
    
    if (!property) {
      // Попробуем найти по полному совпадению
      const propertyByFullName = product.productProperties.find(
        prop => prop.propertyName === propertyName
      );
      if (propertyByFullName) {
        return this.formatPropertyValue(propertyByFullName.value, propertyByFullName.measurementUnitName);
      }
      return '—';
    }
    
    return this.formatPropertyValue(property.value, property.measurementUnitName);
  }

  private formatPropertyValue(value: string, unit: string): string {
    if (!value) return '—';
    if (!unit || unit.trim() === '') return value;
    return `${value} ${unit}`.trim();
  }

  getPropertyValues(propertyName: string): string[] {
    if (!this.selectedCategory?.products) return [];
    
    return this.selectedCategory.products.map(product => 
      this.getProductPropertyValue(product, propertyName)
    );
  }

  getUniqueProperties(): CategoryProperty[] {
    if (!this.selectedCategory?.properties) return [];
    return this.selectedCategory.properties;
  }

  getCommonProperties(): string[] {
    if (!this.selectedCategory?.products || this.selectedCategory.products.length === 0) {
      return [];
    }
    
    // Получаем все уникальные названия свойств из всех продуктов
    const allPropertyNames = new Set<string>();
    
    this.selectedCategory.products.forEach(product => {
      if (product.productProperties && Array.isArray(product.productProperties)) {
        product.productProperties.forEach(prop => {
          if (prop.propertyName) {
            allPropertyNames.add(prop.propertyName);
          }
        });
      }
    });
    
    return Array.from(allPropertyNames);
  }

  formatPrice(price: number): string {
    if (!price && price !== 0) return '—';
    
    return new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  }

  getDiscountPrice(product: Product): number | null {
    if (product.promoOrders && product.promoOrders.length > 0) {
      const activePromo = product.promoOrders.find(promo => 
        new Date(promo.promoOrderGroup.beginDateTime) <= new Date() &&
        new Date(promo.promoOrderGroup.endDateTime) >= new Date()
      );
      
      if (activePromo && activePromo.salePercent > 0) {
        return product.retailPrice * (1 - activePromo.salePercent / 100);
      }
    }
    return null;
  }

  addToBasket(product: Product): void {
    console.log('Добавлено в корзину:', product.shortName);
    // Здесь будет логика добавления в корзину
    // Можно использовать product.countInActiveBasket для отслеживания количества
  }

  toggleFavorite(product: Product): void {
    product.isFavorite = !product.isFavorite;
    console.log('Избранное обновлено для:', product.shortName);
    // Здесь будет API вызов для обновления избранного
  }

  removeFromComparison(productId: string): void {
    if (!this.selectedCategory) return;
    
    this.comparingService.deleteCompareProduct(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('Товар удален из сравнения:', response);
          
          // Удаляем из локального массива
          const index = this.selectedCategory!.products.findIndex(p => p.id === productId);
          if (index > -1) {
            this.selectedCategory!.products.splice(index, 1);
            
            // Если в категории не осталось товаров, перезагружаем данные
            if (this.selectedCategory!.products.length === 0) {
              this.loadComparisonData();
            }
          }
        },
        error: (error) => {
          console.error('Ошибка удаления из сравнения:', error);
        }
      });
  }

  clearComparison(): void {
    if (!this.selectedCategory || this.selectedCategory.products.length === 0) {
      return;
    }
    
    // Удаляем все товары из выбранной категории
    const deletePromises = this.selectedCategory.products.map(product => 
      this.comparingService.deleteCompareProduct(product.id).toPromise()
    );
    
    Promise.all(deletePromises)
      .then(() => {
        console.log('Все товары удалены из сравнения');
        this.selectedCategory!.products = [];
        this.loadComparisonData();
      })
      .catch(error => {
        console.error('Ошибка при очистке сравнения:', error);
      });
  }

  getProductImage(product: Product): string {
    if (product.productImageLinks && product.productImageLinks.length > 0) {
      return product.productImageLinks[0];
    }
    return 'assets/images/default-product.png';
  }

  getProductDisplayName(product: Product): string {
    return product.shortName || product.nameFrom1C || product.fullName || 'Без названия';
  }

  private loadMockData(): void {
    console.log('Загрузка мок-данных для демонстрации');
    
    this.comparisonData = [
      {
        productCategory: {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
          name: 'Бумажные стаканы'
        },
        products: [
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afa1',
            idFrom1C: 'CUP001',
            nameFrom1C: 'Бумажный стакан 250 мл',
            article: 'BS-250',
            shortName: 'Стакан 250мл',
            fullName: 'Бумажный стакан для холодных напитков 250 мл, белый, с логотипом',
            viewPriceSale: 1.8,
            viewPrice: 2.0,
            retailPrice: 1.5,
            retailPriceDest: 1.3,
            wholesalePrice: 1.2,
            wholesalePriceDest: 1.0,
            mainProductCategoryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            productImageLinks: [
              'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png'
            ],
            isFavorite: true,
            countInActiveBasket: 0,
            productProperties: [
              {
                id: '3fa85f64-5717-4562-b3fc-2c963f66afb1',
                value: '250',
                productPropertyId: '3fa85f64-5717-4562-b3fc-2c963f66afc1',
                productInstanceId: '3fa85f64-5717-4562-b3fc-2c963f66afa1',
                propertyName: 'Объем',
                measurementUnitName: 'мл',
                filterType: 0
              },
              {
                id: '3fa85f64-5717-4562-b3fc-2c963f66afb2',
                value: 'Бумага',
                productPropertyId: '3fa85f64-5717-4562-b3fc-2c963f66afc2',
                productInstanceId: '3fa85f64-5717-4562-b3fc-2c963f66afa1',
                propertyName: 'Материал',
                measurementUnitName: '',
                filterType: 0
              },
              {
                id: '3fa85f64-5717-4562-b3fc-2c963f66afb3',
                value: '10',
                productPropertyId: '3fa85f64-5717-4562-b3fc-2c963f66afc3',
                productInstanceId: '3fa85f64-5717-4562-b3fc-2c963f66afa1',
                propertyName: 'Высота',
                measurementUnitName: 'см',
                filterType: 0
              }
            ],
            promoOrders: [
              {
                id: '3fa85f64-5717-4562-b3fc-2c963f66afd1',
                salePercent: 10,
                isRecountNeed: true,
                productId: '3fa85f64-5717-4562-b3fc-2c963f66afa1',
                promoOrderGroupId: '3fa85f64-5717-4562-b3fc-2c963f66afe1',
                promoOrderGroup: {
                  id: '3fa85f64-5717-4562-b3fc-2c963f66afe1',
                  beginDateTime: '2024-01-01T00:00:00Z',
                  endDateTime: '2024-12-31T23:59:59Z',
                  description: 'Скидка 10% на все бумажные стаканы'
                }
              }
            ]
          },
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afa2',
            idFrom1C: 'CUP002',
            nameFrom1C: 'Бумажный стакан 500 мл',
            article: 'BS-500',
            shortName: 'Стакан 500мл',
            fullName: 'Бумажный стакан для горячих напитков 500 мл, коричневый, двойные стенки',
            viewPriceSale: 2.4,
            viewPrice: 2.8,
            retailPrice: 2.0,
            retailPriceDest: 1.8,
            wholesalePrice: 1.6,
            wholesalePriceDest: 1.4,
            mainProductCategoryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
            productImageLinks: [
              'https://пакетон.рф/thumb/2/MS5r_rmwu1y1IkQYoicIQQ/300r270/d/cml_86e04eb1_91a7eb07.png'
            ],
            isFavorite: false,
            countInActiveBasket: 2,
            productProperties: [
              {
                id: '3fa85f64-5717-4562-b3fc-2c963f66afb4',
                value: '500',
                productPropertyId: '3fa85f64-5717-4562-b3fc-2c963f66afc1',
                productInstanceId: '3fa85f64-5717-4562-b3fc-2c963f66afa2',
                propertyName: 'Объем',
                measurementUnitName: 'мл',
                filterType: 0
              },
              {
                id: '3fa85f64-5717-4562-b3fc-2c963f66afb5',
                value: 'Бумага',
                productPropertyId: '3fa85f64-5717-4562-b3fc-2c963f66afc2',
                productInstanceId: '3fa85f64-5717-4562-b3fc-2c963f66afa2',
                propertyName: 'Материал',
                measurementUnitName: '',
                filterType: 0
              },
              {
                id: '3fa85f64-5717-4562-b3fc-2c963f66afb6',
                value: '12',
                productPropertyId: '3fa85f64-5717-4562-b3fc-2c963f66afc3',
                productInstanceId: '3fa85f64-5717-4562-b3fc-2c963f66afa2',
                propertyName: 'Высота',
                measurementUnitName: 'см',
                filterType: 0
              }
            ],
            promoOrders: []
          }
        ],
        properties: [
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afc1',
            fullName: 'Объем',
            description: 'Вместимость стакана',
            measurementUnitId: '3fa85f64-5717-4562-b3fc-2c963f66afd1',
            measurementUnitName: 'мл',
            filterType: 0
          },
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afc2',
            fullName: 'Материал',
            description: 'Материал изготовления',
            measurementUnitId: '3fa85f64-5717-4562-b3fc-2c963f66afd2',
            measurementUnitName: '',
            filterType: 0
          },
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afc3',
            fullName: 'Высота',
            description: 'Высота изделия',
            measurementUnitId: '3fa85f64-5717-4562-b3fc-2c963f66afd3',
            measurementUnitName: 'см',
            filterType: 0
          }
        ]
      },
      {
        productCategory: {
          id: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
          name: 'Пластиковая посуда'
        },
        products: [
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afa3',
            idFrom1C: 'PLATE001',
            nameFrom1C: 'Пластиковая тарелка',
            article: 'PP-20',
            shortName: 'Тарелка 20см',
            fullName: 'Пластиковая тарелка белая 20см, одноразовая',
            viewPriceSale: 4.0,
            viewPrice: 4.5,
            retailPrice: 3.5,
            retailPriceDest: 3.0,
            wholesalePrice: 2.8,
            wholesalePriceDest: 2.5,
            mainProductCategoryId: '3fa85f64-5717-4562-b3fc-2c963f66afa7',
            productImageLinks: [
              'https://пакетон.рф/thumb/2/abcdefghijklmnopqrstuvw/300r270/d/default_plate.png'
            ],
            isFavorite: false,
            countInActiveBasket: 5,
            productProperties: [
              {
                id: '3fa85f64-5717-4562-b3fc-2c963f66afb7',
                value: '20',
                productPropertyId: '3fa85f64-5717-4562-b3fc-2c963f66afc4',
                productInstanceId: '3fa85f64-5717-4562-b3fc-2c963f66afa3',
                propertyName: 'Диаметр',
                measurementUnitName: 'см',
                filterType: 0
              },
              {
                id: '3fa85f64-5717-4562-b3fc-2c963f66afb8',
                value: 'Пластик',
                productPropertyId: '3fa85f64-5717-4562-b3fc-2c963f66afc5',
                productInstanceId: '3fa85f64-5717-4562-b3fc-2c963f66afa3',
                propertyName: 'Материал',
                measurementUnitName: '',
                filterType: 0
              }
            ],
            promoOrders: []
          }
        ],
        properties: [
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afc4',
            fullName: 'Диаметр',
            description: 'Диаметр тарелки',
            measurementUnitId: '3fa85f64-5717-4562-b3fc-2c963f66afd4',
            measurementUnitName: 'см',
            filterType: 0
          },
          {
            id: '3fa85f64-5717-4562-b3fc-2c963f66afc5',
            fullName: 'Материал',
            description: 'Материал изготовления',
            measurementUnitId: '3fa85f64-5717-4562-b3fc-2c963f66afd5',
            measurementUnitName: '',
            filterType: 0
          }
        ]
      }
    ];
    
    this.hasData = this.comparisonData.length > 0;
    this.selectedCategory = this.comparisonData[0];
    this.selectedCategoryIndex = 0;
    this.isLoading = false;
    
    console.log('Мок-данные загружены:', this.comparisonData);
  }
}