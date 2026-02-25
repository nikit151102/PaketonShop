import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subscription, switchMap, catchError, of } from 'rxjs';

import { NewsBannerService } from '../../core/api/news-banner.service';

interface NewsDetail {
  id: string;
  header: string;
  subheader: string;
  content: string;
  description: string;
  beginDateTime: string;
  endDateTime?: string;
  imageInstanceLinks: string[];
  newsBannerType: number;
  link?: string | null;
}

@Component({
  selector: 'app-news-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './news-detail.component.html',
  styleUrls: ['./news-detail.component.scss']
})
export class NewsDetailComponent implements OnInit, OnDestroy {
  news: NewsDetail | null = null;
  isLoading = true;
  error: string | null = null;
  currentImageIndex = 0;
  
  private subscription: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private newsBannerService: NewsBannerService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.loadNewsDetail();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private loadNewsDetail(): void {
    const sub = this.route.params.pipe(
      switchMap(params => {
        const id = params['id'];
        if (!id) {
          return of({ error: 'ID новости не указан' });
        }
        this.isLoading = true;
        return this.newsBannerService.getNewsBannerById(id).pipe(
          catchError(error => {
            console.error('Ошибка загрузки новости:', error);
            return of({ error: 'Не удалось загрузить новость' });
          })
        );
      })
    ).subscribe((response: any) => {
      this.isLoading = false;
      
      if (response.error) {
        this.error = response.error;
        this.news = null;
      } else if (response?.data) {
        this.news = response.data;
        this.error = null;
      } else {
        this.error = 'Новость не найдена';
        this.news = null;
      }
    });

    this.subscription.add(sub);
  }

  // Получить тип новости для отображения
  getNewsTypeLabel(type: number): string {
    const types: Record<number, string> = {
      0: 'Акция',
      1: 'Событие',
      2: 'Новинка'
    };
    return types[type] || 'Новость';
  }

  // Получить цвет для типа новости
  getNewsTypeColor(type: number): string {
    const colors: Record<number, string> = {
      0: '#2a5e1c', // Акция - основной цвет
      1: '#b45309', // Событие - оранжевый
      2: '#065f46'  // Новинка - зеленый
    };
    return colors[type] || '#64748b';
  }

  // Форматирование даты
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Получить период действия
  getValidityPeriod(): string {
    if (!this.news) return '';
    
    const start = this.formatDate(this.news.beginDateTime);
    if (this.news.endDateTime) {
      const end = this.formatDate(this.news.endDateTime);
      return `${start} — ${end}`;
    }
    return `с ${start}`;
  }

  // Проверка, активна ли новость (акция)
  isActive(): boolean {
    if (!this.news?.endDateTime) return true;
    
    const now = new Date();
    const endDate = new Date(this.news.endDateTime);
    return now <= endDate;
  }

  // Получить количество дней до окончания
  getDaysLeft(): number | null {
    if (!this.news?.endDateTime) return null;
    
    const now = new Date();
    const endDate = new Date(this.news.endDateTime);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays > 0 ? diffDays : 0;
  }

  // Переключение изображений (если их несколько)
  nextImage(): void {
    if (this.news?.imageInstanceLinks && this.currentImageIndex < this.news.imageInstanceLinks.length - 1) {
      this.currentImageIndex++;
    }
  }

  prevImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }

  // Безопасный HTML для контента
  sanitizeContent(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  // Поделиться новостью
  shareNews(): void {
    if (navigator.share && this.news) {
      navigator.share({
        title: this.news.header,
        text: this.news.subheader || this.news.description,
        url: window.location.href
      }).catch(() => {
        // Пользователь отменил шаринг или произошла ошибка
      });
    } else {
      // Копируем ссылку в буфер обмена
      navigator.clipboard.writeText(window.location.href).then(() => {
        // Можно показать уведомление
        alert('Ссылка скопирована в буфер обмена!');
      });
    }
  }

  // Перейти назад
  goBack(): void {
    this.router.navigate(['/news']);
  }
}