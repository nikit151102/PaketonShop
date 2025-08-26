import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-carousel-banner',
  imports: [CommonModule],
  templateUrl: './carousel-banner.component.html',
  styleUrl: './carousel-banner.component.scss'
})
export class CarouselBannerComponent  implements OnInit {
slides = [
  {
    image: 'https://images.unsplash.com/photo-1606813909234-96e9c9d4a812?auto=format&fit=crop&w=1350&q=80',
    title: 'Добро пожаловать в ShopZone!',
    subtitle: 'Лучшие товары по лучшим ценам',
  },
  {
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1350&q=80',
    title: 'Скидки до 50%',
    subtitle: 'Успей купить выгодно!',
  },
  {
    image: 'https://images.unsplash.com/photo-1555529669-95a5ba1eaa1e?auto=format&fit=crop&w=1350&q=80',
    title: 'Новинки уже в продаже',
    subtitle: 'Открой для себя новое',
  }
];


  activeIndex = 0;
  interval: any;

  ngOnInit(): void {
    this.autoRotate();
  }

  autoRotate(): void {
    this.interval = setInterval(() => {
      this.nextSlide();
    }, 3000);
  }

  nextSlide(): void {
    this.activeIndex = (this.activeIndex + 1) % this.slides.length;
  }

  prevSlide(): void {
    this.activeIndex = (this.activeIndex - 1 + this.slides.length) % this.slides.length;
  }

  ngOnDestroy(): void {
    clearInterval(this.interval);
  }
}