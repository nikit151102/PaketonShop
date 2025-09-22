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
    image: 'img11.jpg',
    title: '',
    subtitle: '',
  },
  {
    image: 'img22.jpg',
    title: '',
    subtitle: '',
  },
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