import { Component, inject, Input, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserReviewsService } from '../../../core/api/user-reviews.service';

interface Review {
  id: string;
  rating: number;
  pros?: string;
  cons?: string;
  photos?: Array<{ url: string }>;
  requestMessage?: {
    id: string;
    text: string;
    dateTime: string;
    likeCount: number;
    dislikeCount: number;
    rateValue: number | null;
    userInstance?: any;
    isAnonymous?: boolean;
  };
  responseMessage?: {
    id: string;
    text: string;
    dateTime: string;
  };
  product?: {
    fullName: string;
    productImageLink: string;
  };
}

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss']
})
export class ReviewsComponent implements OnInit, OnChanges {
  private readonly userReviewsService = inject(UserReviewsService);

  @Input() productId: string = '';

  // Данные
  data: Review[] = [];
  
  // Пагинация
  currentPage = 0;
  pageSize = 10;
  totalReviews = 0;
  hasMoreReviews = false;

  // Состояния
  loading = false;
  loadingMore = false;
  sending = false;
  error: string | null = null;

  // Форма
  showReviewForm = false;
  newRating = 0;
  newPros = '';
  newCons = '';
  newComment = '';
  isAnonymous = false;

  // Лайки
  likingReviews = new Set<string>();
  dislikingReviews = new Set<string>();

  // Прокрутка
  showBackToTop = false;

  ngOnInit(): void {
    if (this.productId) {
      this.loadReviews();
    }
    this.checkScroll();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && !changes['productId'].firstChange) {
      this.resetReviews();
      if (this.productId) {
        this.loadReviews();
      }
    }
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.checkScroll();
  }

  private checkScroll(): void {
    this.showBackToTop = window.scrollY > 500;
  }

  resetReviews(): void {
    this.data = [];
    this.currentPage = 0;
    this.totalReviews = 0;
    this.hasMoreReviews = false;
  }

  loadReviews(): void {
    if (this.loading) return;

    this.loading = true;
    this.error = null;

    this.userReviewsService
      .getReviewsByProduct(this.productId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          if (this.currentPage === 0) {
            this.data = this.transformToReviews(response.data);
          } else {
            this.data = [...this.data, ...this.transformToReviews(response.data)];
          }

          this.totalReviews = response.totalCount || response.data.length;
          this.hasMoreReviews = this.data.length < this.totalReviews;
          this.loading = false;
        },
        error: (err) => {
          console.error('Ошибка загрузки отзывов:', err);
          this.error = 'Не удалось загрузить отзывы. Пожалуйста, попробуйте позже.';
          this.loading = false;
        }
      });
  }

  loadMoreReviews(): void {
    if (this.loadingMore || !this.hasMoreReviews) return;

    this.loadingMore = true;
    this.currentPage++;

    this.userReviewsService
      .getReviewsByProduct(this.productId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.data = [...this.data, ...this.transformToReviews(response.data)];
          this.hasMoreReviews = this.data.length < this.totalReviews;
          this.loadingMore = false;
        },
        error: (err) => {
          console.error('Ошибка загрузки дополнительных отзывов:', err);
          this.loadingMore = false;
          this.currentPage--;
        }
      });
  }

  private transformToReviews(apiData: any[]): Review[] {
    return apiData.map(item => ({
      id: item.id,
      rating: item.rate || 5,
      pros: item.advantages,
      cons: item.disadvantages,
      photos: item.photos || [],
      requestMessage: item.requestMessage ? {
        id: item.requestMessage.id,
        text: item.requestMessage.text,
        dateTime: item.requestMessage.dateTime,
        likeCount: item.requestMessage.likeCount || 0,
        dislikeCount: item.requestMessage.dislikeCount || 0,
        rateValue: item.requestMessage.rateValue || null,
        userInstance: item.requestMessage.userInstance,
        isAnonymous: item.requestMessage.isAnonymous
      } : undefined,
      responseMessage: item.responseMessage,
      product: item.product
    }));
  }

  toggleReviewForm(): void {
    this.showReviewForm = !this.showReviewForm;
    if (this.showReviewForm) {
      setTimeout(() => {
        document.querySelector('.rating-selector')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }

  onCommentInput(): void {
    if (this.newComment.length > 1000) {
      this.newComment = this.newComment.substring(0, 1000);
    }
  }

  canSubmitReview(): boolean {
    return this.newRating > 0 && !this.sending;
  }

  createReview(): void {
    if (!this.canSubmitReview()) return;

    this.sending = true;
    const now = new Date().toISOString();

    const reviewData = {
      rate: this.newRating,
      advantages: this.newPros || undefined,
      disadvantages: this.newCons || undefined,
      requestMessage: {
        text: this.newComment,
        dateTime: now,
        isAnonymous: this.isAnonymous
      },
      productId: this.productId
    };

    console.log('Отправка отзыва:', reviewData);

    this.userReviewsService
      .createReview(reviewData)
      .subscribe({
        next: () => {
          this.resetForm();
          this.showReviewForm = false;
          this.showNotification('Отзыв успешно опубликован!', 'success');
          
          setTimeout(() => {
            this.resetReviews();
            this.loadReviews();
          }, 300);
        },
        error: (err) => {
          console.error('Ошибка создания отзыва:', err);
          this.sending = false;
          this.error = 'Не удалось отправить отзыв. Попробуйте позже.';
          this.showNotification('Ошибка при отправке отзыва', 'error');
        }
      });
  }

  private resetForm(): void {
    this.newRating = 0;
    this.newPros = '';
    this.newCons = '';
    this.newComment = '';
    this.isAnonymous = false;
    this.sending = false;
  }

  like(review: Review): void {
    if (!review.requestMessage?.id || this.likingReviews.has(review.id)) return;

    this.likingReviews.add(review.id);
    const originalLikes = review.requestMessage.likeCount || 0;
    const originalRate = review.requestMessage.rateValue;

    // Оптимистичное обновление
    if (originalRate === 0) {
      review.requestMessage.dislikeCount = Math.max(0, (review.requestMessage.dislikeCount || 0) - 1);
    }

    const oldRateValue = review.requestMessage.rateValue;
    review.requestMessage.likeCount = (review.requestMessage.likeCount || 0) + (oldRateValue == null ? 1 : -1);
    review.requestMessage.rateValue = oldRateValue == null ? 1 : null;

    this.userReviewsService
      .setRate({ id: review.requestMessage.id, rateValue: review.requestMessage.rateValue })
      .subscribe({
        next: (response) => {
          if (response.likeCount !== undefined) {
            review.requestMessage!.likeCount = response.likeCount;
            review.requestMessage!.dislikeCount = response.dislikeCount;
          }
        },
        error: (err) => {
          console.error('Ошибка оценки:', err);
          review.requestMessage!.likeCount = originalLikes;
          review.requestMessage!.rateValue = originalRate;
        },
        complete: () => {
          this.likingReviews.delete(review.id);
        }
      });
  }

  dislike(review: Review): void {
    if (!review.requestMessage?.id || this.dislikingReviews.has(review.id)) return;

    this.dislikingReviews.add(review.id);
    const originalDislikes = review.requestMessage.dislikeCount || 0;
    const originalRate = review.requestMessage.rateValue;

    // Оптимистичное обновление
    if (originalRate === 1) {
      review.requestMessage.likeCount = Math.max(0, (review.requestMessage.likeCount || 0) - 1);
    }
    review.requestMessage.dislikeCount = (review.requestMessage.dislikeCount || 0) + (review.requestMessage.rateValue == null ? 1 : -1);
    review.requestMessage.rateValue = review.requestMessage.rateValue == null ? 0 : null;

    this.userReviewsService
      .setRate({ id: review.requestMessage.id, rateValue: review.requestMessage.rateValue })
      .subscribe({
        next: (response) => {
          if (response.dislikeCount !== undefined) {
            review.requestMessage!.likeCount = response.likeCount;
            review.requestMessage!.dislikeCount = response.dislikeCount;
          }
        },
        error: (err) => {
          console.error('Ошибка оценки:', err);
          review.requestMessage!.dislikeCount = originalDislikes;
          review.requestMessage!.rateValue = originalRate;
        },
        complete: () => {
          this.dislikingReviews.delete(review.id);
        }
      });
  }

  getAverageRating(): string {
    if (this.data.length === 0) return '0.0';
    const sum = this.data.reduce((acc, r) => acc + (r.rating || 0), 0);
    return (sum / this.data.length).toFixed(1);
  }

  getRatingLabel(rating: number): string {
    const labels = ['', 'Ужасно', 'Плохо', 'Нормально', 'Хорошо', 'Отлично'];
    return labels[rating] || '';
  }

  getUserDisplayName(requestMessage: any): string {
    if (!requestMessage?.userInstance) return 'Анонимный пользователь';
    if (requestMessage.isAnonymous) return 'Анонимный пользователь';

    const user = requestMessage.userInstance;
    const parts = [];
    if (user.lastName) parts.push(user.lastName);
    if (user.firstName) parts.push(user.firstName);
    return parts.length > 0 ? parts.join(' ') : 'Пользователь';
  }

  getUserAvatar(userInstance: any): string {
    if (!userInstance) return 'assets/avatar-anonymous.svg';
    return userInstance.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(this.getUserDisplayName({ userInstance }))}&background=327120&color=fff&bold=true`;
  }

  formatDate(dateString: any): string {
    if (!dateString) return '';

    const utcDate = new Date(dateString);
    if (isNaN(utcDate.getTime())) return dateString;

    const timezoneOffset = new Date().getTimezoneOffset();
    const localDate = new Date(utcDate.getTime() - timezoneOffset * 60 * 1000);
    const now = new Date();
    const diffMs = now.getTime() - localDate.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'только что';
    if (diffHours < 1) return `${diffMinutes} ${this.pluralize(diffMinutes, ['минуту', 'минуты', 'минут'])} назад`;
    if (diffHours < 24) return `${diffHours} ${this.pluralize(diffHours, ['час', 'часа', 'часов'])} назад`;
    if (diffDays === 1) return 'Вчера в ' + localDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    return localDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  pluralize(n: number, forms: [string, string, string]): string {
    n = Math.abs(n) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  }

  scrollToForm(): void {
    this.showReviewForm = true;
    setTimeout(() => {
      document.querySelector('.reviews__form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  openPhoto(photo: any): void {
    // Открыть фото в модалке
    console.log('Open photo:', photo);
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    console.log(`${type}: ${message}`);
  }
}