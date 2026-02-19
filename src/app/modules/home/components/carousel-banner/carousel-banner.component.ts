import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router } from '@angular/router';

interface Slide {
  image: string;
  title?: string;
  subtitle?: string;
  badge?: string;
  buttonText?: string;
  note?: string;
  link?: string;
  action?: () => void;
}

@Component({
  selector: 'app-carousel-banner',
  imports: [CommonModule],
  templateUrl: './carousel-banner.component.html',
  styleUrl: './carousel-banner.component.scss',
})
export class CarouselBannerComponent implements OnInit, OnDestroy {
  slides: Slide[] = [
    {
      image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
      title: 'Летняя распродажа',
      subtitle: 'Скидки до 50% на всю коллекцию',
      badge: 'Скидка',
      buttonText: 'Смотреть товары',
      note: 'Акция действует до 31 августа',
      link: '/categories/sale'
    },
    {
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
      title: 'Новые поступления',
      subtitle: 'Свежая коллекция уже в продаже',
      badge: 'Новинка',
      buttonText: 'Посмотреть новинки',
      note: 'Более 200 новых позиций',
      link: '/categories/new'
    },
    {
      image: 'https://images.unsplash.com/photo-1556742044-3c52d6e88c62?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
      title: 'Премиум качество',
      subtitle: 'Только лучшие материалы и технологии',
      badge: 'Премиум',
      buttonText: 'В каталог',
      note: 'Гарантия 2 года',
      link: '/categories/premium'
    }
  ];

  // Массив с дублированными слайдами для бесконечной прокрутки
  slidesWithDuplicates: Slide[] = [];

  activeIndex = 1; // Начинаем с 1, потому что добавили дубликаты
  displayIndex = 0; // Индекс для отображения пользователю (от 0 до slides.length-1)
  progress = 0;
  autoRotate = true;
  rotationInterval = 4000; // 4 секунд
  private intervalId: any;
  private progressIntervalId: any;
  private startTime = 0;
  imagesLoaded = 0;
  private isTransitioning = false;
  private transitionDuration = 500; // Длительность анимации в мс

  constructor(private router: Router) { }

  ngOnInit(): void {
    // Создаем массив с дублированными слайдами для бесконечной прокрутки
    // Добавляем последний слайд в начало и первый слайд в конец
    this.slidesWithDuplicates = [
      this.slides[this.slides.length - 1], // Последний слайд становится первым
      ...this.slides, // Оригинальные слайды
      this.slides[0] // Первый слайд становится последним
    ];

    this.preloadImages();
    this.startAutoRotation();
    this.startProgress();
    this.startAutoRotation();
  }

  ngOnDestroy(): void {
    this.clearIntervals();
  }

  // Предзагрузка изображений
  private preloadImages(): void {
    this.slidesWithDuplicates.forEach((slide, index) => {
      const img = new Image();
      img.src = slide.image;
      img.onload = () => {
        this.imagesLoaded++;
        console.log(`Изображение ${index + 1} загружено`);
      };
      img.onerror = () => {
        console.error(`Ошибка загрузки изображения ${index + 1}: ${slide.image}`);
        // Заменяем на placeholder при ошибке
        this.slidesWithDuplicates[index].image = 'https://via.placeholder.com/1920x1080/4f46e5/ffffff?text=Баннер+' + ((index - 1) % this.slides.length + 1);
      };
    });
  }

  // Автоматическое вращение
  private startAutoRotation(): void {
    if (!this.autoRotate) return;

    this.clearIntervals();
    this.startTime = Date.now();

    this.intervalId = setInterval(() => {
      this.smoothNextSlide();
    }, this.rotationInterval);
  }

  private startProgress(): void {
    this.progressIntervalId = setInterval(() => {
      if (this.autoRotate && !this.isTransitioning) {
        const elapsed = Date.now() - this.startTime;
        this.progress = (elapsed / this.rotationInterval) * 100;

        if (this.progress >= 100) {
          this.startTime = Date.now();
        }
      }
    }, 50);
  }

  private clearIntervals(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.progressIntervalId) {
      clearInterval(this.progressIntervalId);
    }
  }

  // Плавный переход к следующему слайду
  private smoothNextSlide(): void {
    if (this.isTransitioning) return;

    this.isTransitioning = true;
    this.activeIndex++;
    this.displayIndex = (this.displayIndex + 1) % this.slides.length;
    this.progress = 0;

    // Если дошли до клонированного последнего слайда (первого оригинала)
    if (this.activeIndex === this.slidesWithDuplicates.length - 1) {
      setTimeout(() => {
        // Без анимации перескакиваем на реальный первый слайд
        this.activeIndex = 1;
        this.isTransitioning = false;
      }, this.transitionDuration);
    } else {
      setTimeout(() => {
        this.isTransitioning = false;
      }, this.transitionDuration);
    }

    this.startTime = Date.now();
  }

  // Плавный переход к предыдущему слайду
  private smoothPrevSlide(): void {
    if (this.isTransitioning) return;

    this.isTransitioning = true;
    this.activeIndex--;
    this.displayIndex = (this.displayIndex - 1 + this.slides.length) % this.slides.length;
    this.progress = 0;

    // Если дошли до клонированного первого слайда (последнего оригинала)
    if (this.activeIndex === 0) {
      setTimeout(() => {
        // Без анимации перескакиваем на реальный последний слайд
        this.activeIndex = this.slides.length;
        this.isTransitioning = false;
      }, this.transitionDuration);
    } else {
      setTimeout(() => {
        this.isTransitioning = false;
      }, this.transitionDuration);
    }

    this.startTime = Date.now();
  }

  // Навигация по слайдам (публичные методы)
  nextSlide(): void {
    if (this.isTransitioning) return;
    this.smoothNextSlide();
  }

  prevSlide(): void {
    if (this.isTransitioning) return;
    this.smoothPrevSlide();
  }

  goToSlide(index: number): void {
    if (this.isTransitioning) return;

    this.isTransitioning = true;
    const diff = index - this.displayIndex;

    this.activeIndex += diff;
    this.displayIndex = index;
    this.progress = 0;

    // Корректировка для бесконечной прокрутки
    if (this.activeIndex < 1) {
      setTimeout(() => {
        this.activeIndex = this.slides.length;
        this.isTransitioning = false;
      }, this.transitionDuration);
    } else if (this.activeIndex > this.slides.length) {
      setTimeout(() => {
        this.activeIndex = 1;
        this.isTransitioning = false;
      }, this.transitionDuration);
    } else {
      setTimeout(() => {
        this.isTransitioning = false;
      }, this.transitionDuration);
    }

    this.startTime = Date.now();
  }

  // Управление автопрокруткой
  pauseAutoRotate(): void {
    this.autoRotate = false;
    this.clearIntervals();
  }

  resumeAutoRotate(): void {
    if (this.autoRotate) {
      this.startAutoRotation();
    }
  }

  toggleAutoRotate(): void {
    this.autoRotate = !this.autoRotate;
    if (this.autoRotate) {
      this.startAutoRotation();
    } else {
      this.clearIntervals();
    }
  }

  // Обработчики кликов
  handleButtonClick(slide: Slide): void {
    if (slide.link) {
      this.router.navigate([slide.link]);
    } else if (slide.action) {
      slide.action();
    }
  }

  onImageLoad(): void {
    console.log('Изображение загружено');
  }

  onImageError(event: Event, index: number): void {
    console.error('Ошибка загрузки изображения:', event);
    // Заменяем битое изображение на placeholder
    const actualIndex = (index - 1 + this.slides.length) % this.slides.length;
    this.slidesWithDuplicates[index].image = 'https://via.placeholder.com/1920x1080/4f46e5/ffffff?text=Баннер+' + (actualIndex + 1);
  }

  // Проверка, активен ли слайд
  isSlideActive(index: number): boolean {
    return index === this.displayIndex;
  }

  // Получение текущего слайда
  get currentSlide(): Slide {
    return this.slides[this.displayIndex];
  }

  // Получение реального индекса слайда
  getRealSlideIndex(virtualIndex: number): number {
    if (virtualIndex === 0) return this.slides.length - 1;
    if (virtualIndex === this.slidesWithDuplicates.length - 1) return 0;
    return virtualIndex - 1;
  }
}