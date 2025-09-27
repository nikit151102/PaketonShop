import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { FavoriteFilterRequest, FavoriteResponse } from '../../../models/favorite.product.interface';
import { environment } from '../../../environment';


@Injectable({
  providedIn: 'root'
})
export class ProductFavoriteService {

  constructor(private http: HttpClient) {}

  /**
   * Получить список избранных товаров с фильтрацией
   * @param filter Объект с номером страницы и количеством записей
   * @returns Observable с массивом избранных товаров и метаданными
   */
  getFavorites(filter: FavoriteFilterRequest): Observable<FavoriteResponse> {
    return this.http.post<FavoriteResponse>(
      `${environment.production}/api/Profile/Favorites/Filter`,
      filter
    );
  }

  /**
   * Добавить товар в избранное
   * @param productId ID товара
   * @returns Observable без данных, только статус ответа
   */
  addToFavorites(productId: string): Observable<any> {
    return this.http.post(
      `${environment.production}/api/Entities/ProductInstance/Favorite/${productId}`,
      {}
    );
  }

  /**
   * Удалить товар из избранного
   * @param productId ID товара
   * @returns Observable без данных, только статус ответа
   */
  removeFromFavorites(productId: string): Observable<any> {
    return this.http.delete(
      `${environment.production}/api/Entities/ProductInstance/Unfavorite/${productId}`
    );
  }
}