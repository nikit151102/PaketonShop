import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { FilterResponse } from '../interfaces/promo.interface';

@Injectable({ providedIn: 'root' })
export class PromoOrderService {
  private readonly baseUrl = `${environment.production}/api/Entities/PromoOrder`;

  constructor(private http: HttpClient) {}

  /**
   * Получить акции по фильтру
   */
  getPromoOrders(
    filters: Array<{ field: string; values: string[]; type: number }> = [],
    page: number | null = null,
    pageSize: number | null = null
  ): Observable<FilterResponse<any>> {
    const requestBody: any = { filters };
    if (page !== null) {
      requestBody.page = page;
      requestBody.pageSize = pageSize;
    }
    return this.http.post<FilterResponse<any>>(`${this.baseUrl}/Filter`, requestBody);
  }

  /**
   * Получить детальную информацию по акции
   */
  getPromoOrderById(id: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/${id}`);
  }
}