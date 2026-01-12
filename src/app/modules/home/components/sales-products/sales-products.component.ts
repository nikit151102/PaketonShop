import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-sales-products',
  imports: [CommonModule],
  templateUrl: './sales-products.component.html',
  styleUrl: './sales-products.component.scss',
})
export class SalesProductsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('productsGrid', { static: false }) productsGrid!: ElementRef;

  salesProducts: any[] = [
    {
      id: 1,
      title: 'Картонная коробка 30x20x10 см',
      image:
        'https://images.unsplash.com/photo-1586864384500-d3821f41c0b7?auto=format&fit=crop&w=400&q=80',
      price: 49,
      oldPrice: 69,
      discount: 29,
    },
    {
      id: 2,
      title: 'Почтовый пакет с воздушной прослойкой',
      image:
        'https://images.unsplash.com/photo-1618331835716-5f3eebaea0a5?auto=format&fit=crop&w=400&q=80',
      price: 19,
      oldPrice: 29,
      discount: 34,
    },
    {
      id: 3,
      title: 'Бумажный крафт-пакет с ручками',
      image:
        'https://images.unsplash.com/photo-1612831455542-8e0c6dcb2a9f?auto=format&fit=crop&w=400&q=80',
      price: 12,
      oldPrice: 19,
      discount: 37,
    },
    {
      id: 4,
      title: 'Прозрачная стрейч-пленка 500 мм',
      image:
        'https://images.unsplash.com/photo-1611080626919-7b237dd0fb6b?auto=format&fit=crop&w=400&q=80',
      price: 89,
      oldPrice: 129,
      discount: 31,
    },
    {
      id: 5,
      title: 'Скотч упаковочный 48 мм x 66 м',
      image:
        'https://images.unsplash.com/photo-1609943249853-e7d93de37d9c?auto=format&fit=crop&w=400&q=80',
      price: 39,
      oldPrice: 49,
      discount: 20,
    },
    {
      id: 6,
      title: 'Воздушно-пузырчатая пленка 1 м²',
      image:
        'https://images.unsplash.com/photo-1592229505721-0e3c949d3b1a?auto=format&fit=crop&w=400&q=80',
      price: 25,
      oldPrice: 35,
      discount: 29,
    },
    {
      id: 7,
      title: 'Пластиковый контейнер 500 мл',
      image:
        'https://images.unsplash.com/photo-1627308595181-6f4b9c5e8c5a?auto=format&fit=crop&w=400&q=80',
      price: 15,
      oldPrice: 22,
      discount: 32,
    },
    {
      id: 8,
      title: 'Упаковочная бумага крафт 1x1 м',
      image:
        'https://images.unsplash.com/photo-1603720619821-77b50d9d0839?auto=format&fit=crop&w=400&q=80',
      price: 17,
      oldPrice: 24,
      discount: 29,
    },
    {
      id: 9,
      title: 'Почтовый конверт A5 с уплотнением',
      image:
        'https://images.unsplash.com/photo-1551524613-514b0845f239?auto=format&fit=crop&w=400&q=80',
      price: 11,
      oldPrice: 17,
      discount: 35,
    },
    {
      id: 10,
      title: 'Картонная туба 50 см',
      image:
        'https://images.unsplash.com/photo-1614679113828-0e9fa79e1d13?auto=format&fit=crop&w=400&q=80',
      price: 33,
      oldPrice: 45,
      discount: 27,
    },
    {
      id: 11,
      title: 'Бумажный мешок 10 л',
      image:
        'https://images.unsplash.com/photo-1604066867778-b61c2fd62b4e?auto=format&fit=crop&w=400&q=80',
      price: 14,
      oldPrice: 21,
      discount: 33,
    },
    {
      id: 12,
      title: 'Контейнер пищевой 1 л',
      image:
        'https://images.unsplash.com/photo-1611748000855-224aa2a2e045?auto=format&fit=crop&w=400&q=80',
      price: 20,
      oldPrice: 28,
      discount: 29,
    },
    {
      id: 13,
      title: 'Пластиковый пакет с зип-замком',
      image:
        'https://images.unsplash.com/photo-1616627987746-8df176e6c70a?auto=format&fit=crop&w=400&q=80',
      price: 9,
      oldPrice: 13,
      discount: 31,
    },
    {
      id: 14,
      title: 'Термоупаковка для еды',
      image:
        'https://images.unsplash.com/photo-1620843202037-80ae281d0fa6?auto=format&fit=crop&w=400&q=80',
      price: 22,
      oldPrice: 30,
      discount: 27,
    },
    {
      id: 15,
      title: 'Картонная коробка с окном',
      image:
        'https://images.unsplash.com/photo-1616394584904-497583182d4a?auto=format&fit=crop&w=400&q=80',
      price: 31,
      oldPrice: 45,
      discount: 31,
    },
    {
      id: 16,
      title: 'Крафт-пакет с логотипом',
      image:
        'https://images.unsplash.com/photo-1612831205972-2ae4b9c19591?auto=format&fit=crop&w=400&q=80',
      price: 18,
      oldPrice: 25,
      discount: 28,
    },
    {
      id: 17,
      title: 'Подарочная упаковка (набор)',
      image:
        'https://images.unsplash.com/photo-1607083202673-40516efcaee7?auto=format&fit=crop&w=400&q=80',
      price: 55,
      oldPrice: 75,
      discount: 27,
    },
    {
      id: 18,
      title: 'Пакет майка 30х50 см',
      image:
        'https://images.unsplash.com/photo-1600180758890-6bca7b4148a7?auto=format&fit=crop&w=400&q=80',
      price: 7,
      oldPrice: 10,
      discount: 30,
    },
    {
      id: 19,
      title: 'Картонный лоток для еды',
      image:
        'https://images.unsplash.com/photo-1606788075760-5d8db0bc2df3?auto=format&fit=crop&w=400&q=80',
      price: 23,
      oldPrice: 31,
      discount: 26,
    },
    {
      id: 20,
      title: 'Пластиковый лоток 750 мл',
      image:
        'https://images.unsplash.com/photo-1620499887957-47fa6be1c406?auto=format&fit=crop&w=400&q=80',
      price: 16,
      oldPrice: 22,
      discount: 27,
    },
  ];

  private scrollInterval: any;
  private currentIndex = 0;
  private cardWidth = 0;
  private userScrolled = false;
  private scrollTimeout: any;

  ngAfterViewInit(): void {
    const container = this.productsGrid.nativeElement as HTMLElement;
    const card = container.querySelector('.product-card') as HTMLElement;

    if (container && card) {
      this.cardWidth = card.offsetWidth + 24;

      container.addEventListener('scroll', () => {
        this.userScrolled = true;

        if (this.scrollTimeout) clearTimeout(this.scrollTimeout);

        this.scrollTimeout = setTimeout(() => {
          this.userScrolled = false;
        }, 3000);
      });

      this.scrollInterval = setInterval(() => this.autoScroll(), 3000);
    }
  }

  autoScroll() {
    if (this.userScrolled) return;

    const container = this.productsGrid.nativeElement as HTMLElement;

    const maxScrollLeft = container.scrollWidth - container.clientWidth;

    if (container.scrollLeft + this.cardWidth >= maxScrollLeft) {
      container.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: this.cardWidth, behavior: 'smooth' });
    }
  }

  scrollLeft() {
    const container = this.productsGrid.nativeElement as HTMLElement;
    container.scrollBy({ left: -this.cardWidth, behavior: 'smooth' });
    this.markUserScroll();
  }

  scrollRight() {
    const container = this.productsGrid.nativeElement as HTMLElement;
    container.scrollBy({ left: this.cardWidth, behavior: 'smooth' });
    this.markUserScroll();
  }

  private markUserScroll() {
    this.userScrolled = true;
    if (this.scrollTimeout) clearTimeout(this.scrollTimeout);
    this.scrollTimeout = setTimeout(() => {
      this.userScrolled = false;
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.scrollInterval) {
      clearInterval(this.scrollInterval);
    }
  }
}
