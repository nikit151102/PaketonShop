import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class PromocodeService {
  private readonly baseUrl = `${environment.production}/api/Entities/PromoCode`;

  constructor(private http: HttpClient) {}
  
    /**
     * Получить список промокодом с фильтрацией и пагинацией
     * @param dto Объект с фильтрами, сортировками и пагинацией
     * @returns Observable с массивом корзин
     */
    // filterBaskets(dto: FilterBasketsDto): Observable<ApiResponse<UserBasket[]>> {
    //   return this.http.post<ApiResponse<UserBasket[]>>(
    //     `${this.baseUrl}/Filter`,
    //     dto,
    //   );
    // }
  

}
