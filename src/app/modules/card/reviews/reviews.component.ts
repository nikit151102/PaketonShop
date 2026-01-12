import { Component, inject, Input, OnInit } from '@angular/core';
import { UserQuestionDto } from '../../../../models/questions.interface';
import { UserQuestionsService } from '../../../core/api/user-questions.service';

@Component({
  selector: 'app-reviews',
  imports: [],
  templateUrl: './reviews.component.html',
  styleUrl: './reviews.component.scss',
})
export class ReviewsComponent implements OnInit {
  userQuestionsService = inject(UserQuestionsService);

  /** ID товара, по которому загружаем вопросы */
  @Input() productId: string = '';

  /** Загруженные вопросы */
  data: UserQuestionDto[] = [];

  /** Состояние загрузки */
  loading = false;

  /** Ошибка (если произошла) */
  error: string | null = null;

  ngOnInit(): void {
    if (this.productId) {
      this.loadQuestions();
    }
  }

  /**
   * Загружает вопросы по товару
   */
  loadQuestions() {
    this.loading = true;
    this.error = null;

    this.userQuestionsService
      .getQuestionsByProduct(this.productId, 0, 10)
      .subscribe({
        next: (values) => {
          this.data = values.data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Ошибка загрузки вопросов:', err);
          this.error = 'Не удалось загрузить вопросы. Попробуйте позже.';
          this.loading = false;
        },
      });
  }

  newQuestion: string = '';
  sending: boolean = false;

  createQuestion() {
    if (!this.newQuestion.trim()) return;

    this.sending = true;

    const now = new Date().toISOString();

    this.userQuestionsService
      .createQuestion({
        productId: this.productId,
        dateTime: now,
        requestMessage: {
          text: this.newQuestion,
          dateTime: now,
        },
      })
      .subscribe({
        next: () => {
          this.newQuestion = '';
          this.sending = false;
          this.loadQuestions();
        },
        error: (err) => {
          console.error('Ошибка создания вопроса:', err);
          this.sending = false;
          alert('Не удалось отправить вопрос. Попробуйте позже.');
        },
      });
  }
}
