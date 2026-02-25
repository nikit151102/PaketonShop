import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener, Input } from '@angular/core';
import { Router } from '@angular/router';
import { NewsBannerService, NewsBannerFilterDto } from '../../../../core/api/news-banner.service';

interface Slide {
  image: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  date?: Date;
  buttonText?: string;
  note?: string;
  link?: string;
  id?: string;
}

@Component({
  selector: 'app-carousel-banner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './carousel-banner.component.html',
  styleUrl: './carousel-banner.component.scss',
})
export class CarouselBannerComponent implements OnInit, OnDestroy {
  @Input() autoRotateInterval: number = 3000; 
  @Input() primaryColor: string = '#2a5e1c'; 

  slides: Slide[] = [];
  slidesWithDuplicates: Slide[] = [];

  activeIndex = 1;
  displayIndex = 0; 
  progress = 0;
  autoRotate = true;
  
  private intervalId?: any;
  private progressIntervalId?: any;
  private startTime = 0;
  private isTransitioning = false;
  private transitionDuration = 300;
  
  isLoading = true;
  error: string | null = null;
  imagesLoaded = 0;

  constructor(
    private router: Router,
    private newsBannerService: NewsBannerService
  ) {}

  ngOnInit(): void {
    this.loadBanners();
  }

  ngOnDestroy(): void {
    this.clearAllIntervals();
  }

  loadBanners(): void {
    this.isLoading = true;
    this.error = null;

    const filterDto: NewsBannerFilterDto = {
      filters: [
        {
          field: 'newsBannerType',
          values: [1],
          type: 1
        },
               {
          field: 'isDeleted',
          values: [1],
          type: 1
        }
        
      ],
      sorts: [
        {
          field: 'createdAt',
          sortType: 1
        }
      ],
      page: 0,
      pageSize: 10
    };

    this.newsBannerService.getNewsBannersByFilter(filterDto).subscribe({
      next: (response) => {
        if (response?.data?.length) {
          this.slides = this.mapBannersToSlides(response.data);
          this.initializeCarousel();
        } else {
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки баннеров:', error);
        this.error = 'Не удалось загрузить баннеры';
        this.isLoading = false;
      }
    });
  }

  // Маппинг данных с API
  private mapBannersToSlides(banners: any[]): Slide[] {
    return banners.map(banner => ({
      id: banner.id,
      image: banner.imageInstanceLinks?.[0] || this.getPlaceholderImage(banner.id),
      title: banner.header || 'Акция',
      subtitle: banner.subheader || 'Специальное предложение',
      badge: banner.badge || 'НОВИНКА',
      date: banner.createdAt ? new Date(banner.createdAt) : new Date(),
      buttonText: 'Подробнее',
      note: 'Акция действует ограниченное время',
      link: `/news/${banner.id}`
    }));
  }

  // Заглушка для изображений
  private getPlaceholderImage(id?: string): string {
    const colors = ['2a5e1c', '1e4514', '3f7a2e', '4c9e34', '5fb83e'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    return `https://via.placeholder.com/1920x1080/${color}/ffffff?text=Баннер+${id || ''}`;
  }

  // Инициализация карусели
  private initializeCarousel(): void {
    if (this.slides.length === 0) return;

    // Создаем массив с дублированными слайдами
    this.slidesWithDuplicates = [
      this.slides[this.slides.length - 1],
      ...this.slides,
      this.slides[0]
    ];

    this.preloadImages();
    this.startAutoRotation();
  }

  // Предзагрузка изображений
  private preloadImages(): void {
    this.slidesWithDuplicates.forEach((slide, index) => {
      const img = new Image();
      img.src = slide.image;
      img.onload = () => {
        this.imagesLoaded++;
      };
      img.onerror = () => {
        console.warn(`Ошибка загрузки изображения ${index + 1}`);
        this.slidesWithDuplicates[index].image = this.getPlaceholderImage();
      };
    });
  }

  // Автопрокрутка (всегда активна)
  private startAutoRotation(): void {
    this.clearAllIntervals();
    this.startTime = Date.now();

    // Интервал для смены слайдов
    this.intervalId = setInterval(() => {
      if (!this.isTransitioning && this.autoRotate) {
        this.nextSlide();
      }
    }, this.autoRotateInterval);

    // Интервал для прогресс-бара
    this.progressIntervalId = setInterval(() => {
      if (this.autoRotate && !this.isTransitioning) {
        const elapsed = Date.now() - this.startTime;
        this.progress = (elapsed / this.autoRotateInterval) * 100;

        if (this.progress >= 100) {
          this.startTime = Date.now();
        }
      }
    }, 50);
  }

  // Очистка всех интервалов
  private clearAllIntervals(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
      this.progressIntervalId = undefined;
    }
  }

  // Следующий слайд
  nextSlide(): void {
    if (this.isTransitioning || this.slides.length === 0) return;

    this.isTransitioning = true;
    this.activeIndex++;
    this.displayIndex = (this.displayIndex + 1) % this.slides.length;
    this.progress = 0;
    this.startTime = Date.now();

    if (this.activeIndex === this.slidesWithDuplicates.length - 1) {
      // Дошли до последнего дубликата
      setTimeout(() => {
        this.activeIndex = 1;
        this.isTransitioning = false;
      }, this.transitionDuration);
    } else {
      setTimeout(() => {
        this.isTransitioning = false;
      }, this.transitionDuration);
    }
  }

  // Предыдущий слайд
  prevSlide(): void {
    if (this.isTransitioning || this.slides.length === 0) return;

    this.isTransitioning = true;
    this.activeIndex--;
    this.displayIndex = (this.displayIndex - 1 + this.slides.length) % this.slides.length;
    this.progress = 0;
    this.startTime = Date.now();

    if (this.activeIndex === 0) {
      // Дошли до первого дубликата
      setTimeout(() => {
        this.activeIndex = this.slides.length;
        this.isTransitioning = false;
      }, this.transitionDuration);
    } else {
      setTimeout(() => {
        this.isTransitioning = false;
      }, this.transitionDuration);
    }
  }

  // Переход к конкретному слайду
  goToSlide(index: number): void {
    if (this.isTransitioning || this.slides.length === 0 || index === this.displayIndex) return;

    this.isTransitioning = true;
    const diff = index - this.displayIndex;
    this.activeIndex += diff;
    this.displayIndex = index;
    this.progress = 0;
    this.startTime = Date.now();

    setTimeout(() => {
      if (this.activeIndex < 1) {
        this.activeIndex = this.slides.length;
      } else if (this.activeIndex > this.slides.length) {
        this.activeIndex = 1;
      }
      this.isTransitioning = false;
    }, this.transitionDuration);
  }

  // Обработка наведения мыши
  pauseAutoRotate(): void {
    this.autoRotate = false;
  }

  resumeAutoRotate(): void {
    this.autoRotate = true;
    this.startTime = Date.now();
  }

  // Переключение автопрокрутки
  toggleAutoRotate(): void {
    this.autoRotate = !this.autoRotate;
    if (this.autoRotate) {
      this.startAutoRotation();
    } else {
      this.clearAllIntervals();
    }
  }

  // Обработка клика по кнопке
  handleButtonClick(slide: Slide): void {
    if (slide.link) {
      this.router.navigate([slide.link]);
    } else if (slide.id) {
      this.router.navigate(['/news', slide.id]);
    }
  }

  // Обработка ошибки загрузки изображения
  onImageError(event: Event, index: number): void {
    console.warn('Ошибка загрузки изображения, индекс:', index);
    this.slidesWithDuplicates[index].image = this.getPlaceholderImage();
  }

  onImageLoad(): void {
    // Можно добавить логику при загрузке изображения
  }

  // Геттеры
  get hasSlides(): boolean {
    return this.slides.length > 0;
  }
}