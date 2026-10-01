import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { Subscription, switchMap, of, catchError } from 'rxjs';
import { NewsBannerService } from '../../core/api/news-banner.service';

interface SectionDetail {
  id: string;
  position: number;
  contentType: number; // 1 = Текст, 2 = Таблица
  blockType: number;   // 1 = Standard, 2 = Extended, 3 = FullWidth
  header: string;
  subheader: string;
  mainText: string;
  imageInstanceLinks: string[];
}

interface NewsDetail {
  id: string;
  header: string;
  subheader: string;
  content: string; // Оставляем для обратной совместимости
  description: string;
  beginDateTime: string;
  endDateTime?: string;
  imageInstanceLinks: string[];
  newsBannerType: number;
  link?: string | null;
  sections: SectionDetail[]; // <-- Новое поле
}

@Component({
  selector: 'app-article-details',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './article-details.component.html',
  styleUrl: './article-details.component.scss'
})
export class ArticleDetailsComponent implements OnInit, OnDestroy {
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
  ) { }

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
          return of({ error: 'ID статьи не указан' });
        }
        this.isLoading = true;
        return this.newsBannerService.getNewsBannerById(id).pipe(
          catchError(() => of({ error: 'Не удалось загрузить статью' }))
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
        this.error = 'Статья не найдена';
        this.news = null;
      }
    });

    this.subscription.add(sub);
  }

  // 🔹 Получаем отсортированные по позиции секции
  get sortedSections(): SectionDetail[] {
    if (!this.news?.sections) return [];
    return [...this.news.sections].sort((a, b) => a.position - b.position);
  }

  // 🔹 Парсинг данных таблицы из JSON строки
  getTableData(mainText: string): any {
    try {
      return JSON.parse(mainText);
    } catch {
      return null;
    }
  }

  // 🔹 CSS класс для типа блока
  getBlockClass(blockType: number): string {
    switch (blockType) {
      case 1: return 'block-standard';
      case 2: return 'block-extended';
      case 3: return 'block-fullwidth';
      default: return 'block-standard';
    }
  }

  getNewsTypeLabel(type: number): string {
    const types: Record<number, string> = { 0: 'Акция', 1: 'Событие', 2: 'Статья' };
    return types[type] || 'Новость';
  }

  getNewsTypeColor(type: number): string {
    const colors: Record<number, string> = { 0: '#2a5e1c', 1: '#b45309', 2: '#065f46' };
    return colors[type] || '#64748b';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  getValidityPeriod(): string {
    if (!this.news) return '';
    const start = this.formatDate(this.news.beginDateTime);
    if (this.news.endDateTime) {
      return `${start} — ${this.formatDate(this.news.endDateTime)}`;
    }
    return `с ${start}`;
  }

  isActive(): boolean {
    if (!this.news?.endDateTime) return true;
    return new Date() <= new Date(this.news.endDateTime);
  }

  getDaysLeft(): number | null {
    if (!this.news?.endDateTime) return null;
    const diffTime = new Date(this.news.endDateTime).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  nextImage(): void {
    if (this.news?.imageInstanceLinks && this.currentImageIndex < this.news.imageInstanceLinks.length - 1) {
      this.currentImageIndex++;
    }
  }

  prevImage(): void {
    if (this.currentImageIndex > 0) this.currentImageIndex--;
  }

  sanitizeContent(content: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(content);
  }

  goBack(): void {
    this.router.navigate(['/articles']);
  }
}