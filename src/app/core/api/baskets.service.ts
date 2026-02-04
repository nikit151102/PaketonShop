import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import {
  FilterBasketsDto,
  UserBasket,
  CreateBasketDto,
  UpdateBasketDto,
  BasketProductDto,
  ApiResponse,
} from '../../../models/baskets.interface';

@Injectable({
  providedIn: 'root',
})
export class BasketsService {
  private readonly baseUrl = `${environment.production}/api/Entities/UserBasket`;

  constructor(private http: HttpClient) {}

  /**
   * Получить список корзин с фильтрацией и пагинацией
   * @param dto Объект с фильтрами, сортировками и пагинацией
   * @returns Observable с массивом корзин
   */
  filterBaskets(dto: FilterBasketsDto): Observable<ApiResponse<UserBasket[]>> {
    return this.http.post<ApiResponse<UserBasket[]>>(
      `${this.baseUrl}/Filter`,
      dto,
    );
  }

  /**
   * Получить корзину по ID
   * @param id ID корзины
   * @returns Observable с данными корзины
   */
  getBasketById(id: string): Observable<ApiResponse<UserBasket>> {
    return this.http.get<ApiResponse<UserBasket>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Создать новую корзину
   * @param dto Данные для создания корзины
   * @returns Observable с результатом операции
   */
  createBasket(dto: CreateBasketDto): Observable<ApiResponse<UserBasket>> {
    return this.http.post<ApiResponse<UserBasket>>(this.baseUrl, dto);
  }

  /**
   * Обновить существующую корзину
   * @param id ID корзины
   * @param dto Обновлённые данные корзины
   * @returns Observable с результатом операции
   */
  updateBasket(
    id: string,
    dto: UpdateBasketDto,
  ): Observable<ApiResponse<UserBasket>> {
    return this.http.put<ApiResponse<UserBasket>>(`${this.baseUrl}/${id}`, dto);
  }

  /**
   * Удалить корзину
   * @param id ID корзины
   * @returns Observable с результатом операции
   */
  deleteBasket(id: string): Observable<ApiResponse<UserBasket>> {
    return this.http.delete<ApiResponse<UserBasket>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Добавить продукт в корзину
   * @param dto Данные о добавляемом продукте
   * @returns Observable с результатом операции
   */
  addProduct(
    dto: BasketProductDto,
  ): Observable<ApiResponse<{ id: string; name: string; count: number }>> {
    return this.http.post<
      ApiResponse<{ id: string; name: string; count: number }>
    >(`${this.baseUrl}/ChangeProductCount`, dto);
  }

  /**
   * Удалить продукт из корзины
   * @param dto Данные о продукте, который нужно удалить
   * @returns Observable с результатом операции
   */
  removeProduct(
    dto: BasketProductDto,
  ): Observable<ApiResponse<{ id: string; name: string; count: number }>> {
    return this.http.post<
      ApiResponse<{ id: string; name: string; count: number }>
    >(`${this.baseUrl}/RemoveProduct`, dto);
  }

  
  /**
   * Добавить товар в корзину
   */
  addProductToBasket(basketId: string, product: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/${basketId}/products`, product);
  }

  /**
   * Удалить товары из корзины
   */
  removeProductsFromBasket(basketId: string, productIds: string[]): Observable<any> {
    return this.http.delete(`${this.baseUrl}/${basketId}/products`, {
      body: { productIds }
    });
  }

}
