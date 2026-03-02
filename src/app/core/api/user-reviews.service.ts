import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { UserReviewsCreateDTO, ReviewsQueryDto, UserReviewsDto } from '../../../models/reviews.interface';

@Injectable({
  providedIn: 'root'
})
export class UserReviewsService {
  private baseUrl = `${environment.production}`;

  constructor(private http: HttpClient) {}

  /**
   * Создать новый отзыв по товару
   * @param dto Данные для создания отзыва
   * @returns Observable с результатом операции
   */
  createReview(dto: UserReviewsCreateDTO): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Entities/FeedBack`, dto);
  }

  /**
   * Получить все отзывы текущего пользователя
   * @param queryDto Параметры фильтрации/сортировки/пагинации
   * @returns Observable с массивом отзывов
   */
  getUserReviews(queryDto: ReviewsQueryDto): Observable<UserReviewsDto[]> {
    return this.http.post<UserReviewsDto[]>(
      `${this.baseUrl}/api/Profile/FeedBack`,
      queryDto,
    );
  }

  /**
   * Получить все отзывы по конкретному товару
   * @param productId ID товара
   * @param page Номер страницы
   * @param pageSize Размер страницы
   * @returns Observable с массивом отзывов по товару
   */
  getReviewsByProduct(
    productId: string,
    page: number = 0,
    pageSize: number = 20,
  ): Observable<any> {
    const body: ReviewsQueryDto = {
      filters: [{ field: 'ProductId', values: [productId], type: 10 }],
      page,
      pageSize,
    };

    return this.http.post<any>(
      `${this.baseUrl}/api/Entities/FeedBack/Filter`,
      body,
    );
  }

  /**
   * Установить оценку (лайк/дизлайк) для отзыва
   * @param data ID сообщения и значение оценки
   * @returns Observable с результатом
   */
  setRate(data: { id: string; rateValue: number | null }): Observable<any> {
    console.log('setRate', data);
    return this.http.put<any>(
      `${this.baseUrl}/api/Entities/FeedBack/setRate`,
      data,
    );
  }
}