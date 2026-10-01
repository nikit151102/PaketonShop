import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TitleComponent } from '../../core/components/title/title.component';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { NewsBannerService, NewsBannerFilterDto } from '../../core/api/news-banner.service';

// Интерфейс для одного элемента новости с бэкенда (адаптирован под ваш ответ)
interface NewsBanner {
  id: string;
  header: string;          // Заголовок
  subheader: string;        // Подзаголовок (использую как краткое описание)
  description: string;      // Полное описание (контент)
  beginDateTime: string;    // Дата начала
  endDateTime?: string;     // Дата окончания (опционально)
  imageInstanceLinks: string[]; // Массив ссылок на изображения
  newsBannerType: number;   // Тип баннера
}

// Интерфейс для элемента в нашем UI
interface NewsItem {
  id: string;
  title: string;
  summary: string;
  content: string;
  imageUrl: string;
  date: Date;
  type: number;
}

@Component({
  selector: 'app-articles',
  imports: [CommonModule,
    RouterLink,
    TitleComponent,],
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss'
})
export class ArticlesComponent implements OnInit {
  newsItems: NewsItem[] = [];
  filteredNewsItems: NewsItem[] = [];
  isLoading = true;
  error: string | null = null;

  selectedType = -1;

  // Правильное использование Inject
  constructor(private newsBannerService: NewsBannerService,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
   this.loadData()
  }

  loadData(): void {
    this.isLoading = true;
    this.error = null;

    const filterDto: NewsBannerFilterDto = {
      filters: [
        {
          field: 'newsBannerType',
          values: [2], // Получаем все типы новостей
          type: 1
        }
      ],
      sorts: [
        {
          field: 'beginDateTime', // Сортируем по дате начала
          sortType: 0 // 0 - DESC (сначала новые), 1 - ASC
        }
      ],
      page: 0,
      pageSize: 20
    };

    this.newsBannerService.getNewsBannersByFilter(filterDto).subscribe({
      next: (response) => {
        if (response?.data?.length) {
          this.newsItems = response.data.map((item: NewsBanner) => this.mapToNewsItem(item));
          this.filterByType(); // Применяем фильтр после загрузки
        } else {
          this.newsItems = [];
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.error = 'Не удалось загрузить новости. Пожалуйста, попробуйте позже.';
        this.isLoading = false;
      }
    });
  }

  // Маппинг данных с бэкенда в наш формат
  private mapToNewsItem(banner: NewsBanner): NewsItem {
    return {
      id: banner.id,
      title: banner.header,
      summary: banner.subheader || this.truncateText(banner.description, 120),
      content: banner.description,
      imageUrl: banner.imageInstanceLinks?.[0] || 'assets/images/placeholder.jpg', // Запасное изображение
      date: new Date(banner.beginDateTime),
      type: banner.newsBannerType
    };
  }

  // Обрезка текста
  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Фильтрация по типу новости
  filterByType(): void {
    if (this.selectedType === -1) {
      this.filteredNewsItems = [...this.newsItems];
    } else {
      this.filteredNewsItems = this.newsItems.filter(item => item.type === this.selectedType);
    }
  }

  // Обработчик изменения фильтра
  onTypeChange(type: number): void {
    this.selectedType = type;
    this.filterByType();
  }

  // Безопасный HTML для контента (если нужно отображать форматированный текст)
  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}