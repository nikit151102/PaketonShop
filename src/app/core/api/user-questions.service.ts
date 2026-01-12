import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import {
  UserQuestionCreateDTO,
  QuestionQueryDto,
  UserQuestionDto,
} from '../../../models/questions.interface';

@Injectable({
  providedIn: 'root',
})
export class UserQuestionsService {
  private baseUrl = `${environment.production}`;

  constructor(private http: HttpClient) {}

  /**
   * Создать новый вопрос по товару
   * @param dto Данные для создания вопроса
   * @returns Observable с результатом операции
   */
  createQuestion(dto: UserQuestionCreateDTO): Observable<any> {
    return this.http.post(`${this.baseUrl}/api/Entities/UserQuestion`, dto);
  }

  /**
   * Получить все вопросы текущего пользователя
   * @param queryDto Параметры фильтрации/сортировки/пагинации
   * @returns Observable с массивом вопросов и ответов
   */
  getUserQuestions(queryDto: QuestionQueryDto): Observable<UserQuestionDto[]> {
    return this.http.post<UserQuestionDto[]>(
      `${this.baseUrl}/api/Profile/UserQuestions`,
      queryDto,
    );
  }

  /**
   * Получить все вопросы по конкретному товару
   * @param productId ID товара
   * @param page Номер страницы
   * @param pageSize Размер страницы
   * @returns Observable с массивом вопросов по товару
   */
  getQuestionsByProduct(
    productId: string,
    page: number = 0,
    pageSize: number = 20,
  ): Observable<any> {
    const body: QuestionQueryDto = {
      filters: [{ field: 'ProductId', values: [productId], type: 10 }],
      page,
      pageSize,
    };

    return this.http.post<UserQuestionDto[]>(
      `${this.baseUrl}/api/Entities/UserQuestion/Filter`,
      body,
    );
  }

  SetRate(data: { id: string; rateValue: number }) {
    return this.http.put<any>(
      `${this.baseUrl}/api/Entities/UserQuestion/setRate`,
      data,
    );
  }
}
