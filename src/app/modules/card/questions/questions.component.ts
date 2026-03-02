import { Component, inject, Input, OnInit, OnChanges, SimpleChanges, HostListener } from '@angular/core';
import { UserQuestionsService } from '../../../core/api/user-questions.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-questions',
  imports: [CommonModule, FormsModule],
  templateUrl: './questions.component.html',
  styleUrl: './questions.component.scss',
})
export class QuestionsComponent implements OnInit, OnChanges {
  private readonly userQuestionsService = inject(UserQuestionsService);

  @Input() productId: string = '';

  // Загруженные вопросы
  questions: any[] = [];

  // Пагинация
  currentPage = 0;
  pageSize = 10;
  totalQuestions = 0;
  hasMoreQuestions = false;

  // Состояния
  loading = false;
  loadingMore = false;
  sending = false;
  error: string | null = null;

  // Новый вопрос
  newQuestion = '';
  isAnonymous = false;
  showQuestionForm = false;
  isFormVisible = false;

  // Текущие действия лайков (чтобы избежать двойных кликов)
  public likingQuestions = new Set<string>();
  public dislikingQuestions = new Set<string>();
  public helpfulAnswers = new Set<string>();

  // Прокрутка
  showBackToTop = false;

  ngOnInit(): void {
    if (this.productId) {
      this.loadQuestions();
    }

    // Отслеживаем прокрутку
    this.checkScroll();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productId'] && !changes['productId'].firstChange) {
      this.resetQuestions();
      if (this.productId) {
        this.loadQuestions();
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

  resetQuestions(): void {
    this.questions = [];
    this.currentPage = 0;
    this.totalQuestions = 0;
    this.hasMoreQuestions = false;
  }

  loadQuestions(): void {
    if (this.loading) return;

    this.loading = true;
    this.error = null;

    this.userQuestionsService
      .getQuestionsByProduct(this.productId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          if (this.currentPage === 0) {
            this.questions = response.data;
          } else {
            this.questions = [...this.questions, ...response.data];
          }

          this.totalQuestions = response.totalCount || response.data.length;
          this.hasMoreQuestions = this.questions.length < this.totalQuestions;
          this.loading = false;
        },
        error: (err) => {
          console.error('Ошибка загрузки вопросов:', err);
          this.error = 'Не удалось загрузить вопросы. Пожалуйста, попробуйте позже.';
          this.loading = false;
        },
      });
  }

  loadMoreQuestions(): void {
    if (this.loadingMore || !this.hasMoreQuestions) return;

    this.loadingMore = true;
    this.currentPage++;

    this.userQuestionsService
      .getQuestionsByProduct(this.productId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response) => {
          this.questions = [...this.questions, ...response.data];
          this.hasMoreQuestions = this.questions.length < this.totalQuestions;
          this.loadingMore = false;
        },
        error: (err) => {
          console.error('Ошибка загрузки дополнительных вопросов:', err);
          this.loadingMore = false;
          this.currentPage--;
        },
      });
  }

  toggleQuestionForm(): void {
    this.showQuestionForm = !this.showQuestionForm;
    if (this.showQuestionForm) {
      setTimeout(() => {
        const textarea = document.querySelector('.form-textarea') as HTMLElement;
        textarea?.focus();
        this.scrollToElement(textarea);
      }, 100);
    }
  }

  onQuestionInput(): void {
    // Ограничение длины текста
    if (this.newQuestion.length > 500) {
      this.newQuestion = this.newQuestion.substring(0, 500);
    }
  }


  createQuestion(): void {
    if (!this.newQuestion.trim() || this.sending) return;

    this.sending = true;
    const now = new Date().toISOString();

    const requestMessage = {
      text: this.newQuestion.trim(),
      dateTime: now,
      isAnonymous: this.isAnonymous
    };

    this.userQuestionsService
      .createQuestion({
        productId: this.productId,
        dateTime: now,
        requestMessage: requestMessage,
      })
      .subscribe({
        next: () => {
          this.newQuestion = '';
          this.isAnonymous = false;
          this.sending = false;
          this.showQuestionForm = false;

          // Показать уведомление об успехе
          this.showNotification('Вопрос успешно отправлен!', 'success');

          // Обновляем список
          setTimeout(() => {
            this.resetQuestions();
            this.loadQuestions();
          }, 300);
        },
        error: (err) => {
          console.error('Ошибка создания вопроса:', err);
          this.sending = false;
          this.error = 'Не удалось отправить вопрос. Пожалуйста, попробуйте позже.';
          this.showNotification('Ошибка при отправке вопроса', 'error');
        },
      });
  }

  like(question: any): void {
    if (!question.requestMessage?.id || this.likingQuestions.has(question.id)) return;

    this.likingQuestions.add(question.id);
    const originalLikes = question.requestMessage.likeCount || 0;
    const originalRate = question.requestMessage.rateValue;

    // Оптимистичное обновление UI
    if (originalRate === 0) {
      question.requestMessage.dislikeCount = Math.max(0, (question.requestMessage.dislikeCount || 0) - 1);
    }

    const oldRateValue = question.requestMessage.rateValue;
    question.requestMessage.likeCount = (question.requestMessage.likeCount || 0) + (oldRateValue == null ? 1 : -1);
    question.requestMessage.rateValue = oldRateValue == null ? 1 : null;

    this.userQuestionsService
      .SetRate({ id: question.requestMessage.id, rateValue: question.requestMessage.rateValue })
      .subscribe({
        next: (response) => {
          if (response.likeCount !== undefined) {
            question.requestMessage.likeCount = response.likeCount;
            question.requestMessage.dislikeCount = response.dislikeCount;
          }
        },
        error: (err) => {
          console.error('Ошибка оценки:', err);
          question.requestMessage.likeCount = originalLikes;
          question.requestMessage.rateValue = originalRate;
        },
        complete: () => {
          this.likingQuestions.delete(question.id);
        }
      });
  }

  dislike(question: any): void {
    if (!question.requestMessage?.id || this.dislikingQuestions.has(question.id)) return;

    this.dislikingQuestions.add(question.id);
    const originalDislikes = question.requestMessage.dislikeCount || 0;
    const originalRate = question.requestMessage.rateValue;

    // Оптимистичное обновление UI
    if (originalRate === 1) {
      question.requestMessage.likeCount = Math.max(0, (question.requestMessage.likeCount || 0) - 1);
    }
    question.requestMessage.dislikeCount = (question.requestMessage.dislikeCount || 0) + (question.requestMessage.rateValue == null ? 1 : -1);
    question.requestMessage.rateValue = question.requestMessage.rateValue == null ? 0 : null;

    this.userQuestionsService
      .SetRate({ id: question.requestMessage.id, rateValue: question.requestMessage.rateValue })
      .subscribe({
        next: (response) => {
          if (response.dislikeCount !== undefined) {
            question.requestMessage.likeCount = response.likeCount;
            question.requestMessage.dislikeCount = response.dislikeCount;
          }
        },
        error: (err) => {
          console.error('Ошибка оценки:', err);
          question.requestMessage.dislikeCount = originalDislikes;
          question.requestMessage.rateValue = originalRate;
        },
        complete: () => {
          this.dislikingQuestions.delete(question.id);
        }
      });
  }

  markHelpful(question: any): void {
    if (!question.responseMessage?.id || this.helpfulAnswers.has(question.id)) return;

    this.helpfulAnswers.add(question.id);

    // Здесь можно добавить вызов API для отметки полезности ответа

    setTimeout(() => {
      this.helpfulAnswers.delete(question.id);
      this.showNotification('Спасибо за ваш отзыв!', 'success');
    }, 1000);
  }

  getRatingButtonsClass(question: any): any {
    return {
      'disabled': !question.requestMessage?.id ||
        this.likingQuestions.has(question.id) ||
        this.dislikingQuestions.has(question.id),
      'liked': question.requestMessage?.rateValue === 1,
      'disliked': question.requestMessage?.rateValue === 0
    };
  }

  getUserDisplayName(requestMessage: any): string {
    if (!requestMessage?.userInstance) return 'Анонимный пользователь';

    if (requestMessage.isAnonymous) {
      return 'Анонимный пользователь';
    }

    const user = requestMessage.userInstance;
    const parts = [];

    if (user.lastName) parts.push(user.lastName);
    if (user.firstName) parts.push(user.firstName);

    return parts.length > 0 ? parts.join(' ') : 'Пользователь';
  }

  getUserAvatar(userInstance: any): string {
    if (!userInstance) return 'assets/avatar-anonymous.svg';

    return userInstance.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(this.getUserDisplayName({ userInstance }))}&background=667eea&color=fff&bold=true`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';

    const utcDate = new Date(dateString);

    if (isNaN(utcDate.getTime())) {
      return dateString;
    }

    const timezoneOffset = new Date().getTimezoneOffset();

    const localDate = new Date(utcDate.getTime() - timezoneOffset * 60 * 1000);

    const now = new Date();
    const diffMs = now.getTime() - localDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffMinutes < 1) {
      return 'только что';
    } else if (diffHours < 1) {
      return `${diffMinutes} ${this.pluralize(diffMinutes, ['минуту', 'минуты', 'минут'])} назад`;
    } else if (diffHours < 24) {
      return `${diffHours} ${this.pluralize(diffHours, ['час', 'часа', 'часов'])} назад`;
    } else if (diffDays === 1) {
      return 'Вчера в ' + localDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      const days = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
      return `${days[localDate.getDay()]}, ${localDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    }

    return localDate.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  private pluralize(n: number, forms: [string, string, string]): string {
    n = Math.abs(n) % 100;
    const n1 = n % 10;
    if (n > 10 && n < 20) return forms[2];
    if (n1 > 1 && n1 < 5) return forms[1];
    if (n1 === 1) return forms[0];
    return forms[2];
  }

  scrollToForm(): void {
    this.showQuestionForm = true;
    setTimeout(() => {
      const form = document.querySelector('.question-form-section');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private scrollToElement(element: any): void {
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  private showNotification(message: string, type: 'success' | 'error'): void {
    // Здесь можно реализовать систему уведомлений
    console.log(`${type}: ${message}`);
  }
}