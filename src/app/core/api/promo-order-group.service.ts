import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';
import { environment } from '../../../environment';
import { FilterResponse, PromoOrderGroup, PromoOrder } from '../interfaces/promo.interface';

@Injectable({ providedIn: 'root' })
export class PromoOrderGroupService {
  private readonly baseUrl = `${environment.production}/api/Entities`;

  constructor(private http: HttpClient) { }

  /**
   * Получить группы акций с вложенными товарами
   */
  getPromoGroupsWithProducts(
    page = 0,
    pageSize = 10
  ): Observable<PromoOrderGroup[]> {
    // 1. Загружаем группы
    return this.getGroups(page, pageSize).pipe(
      switchMap((groupsResponse) => {
        const groups = groupsResponse.data.filter((g: any) => !g.isDeleted);

        // 2. Для каждой группы загружаем акции с товарами
        const groupRequests = groups.map((group: any) =>
          this.getOrdersByGroupId(group.id).pipe(
            map((ordersResponse) => {
              const orders = ordersResponse.data.filter((o: any) => !o.isDeleted);
              return {
                ...group,
                promoOrders: orders.map((order: any) => ({
                  id: order.id,
                  salePercent: order.salePercent,
                  isRecountNeed: order.isRecountNeed,
                  productId: order.productId,
                  product: order.product, // 🔹 Продукт уже вложен в ответ API
                  promoOrderGroupId: order.promoOrderGroupId,
                  isDeleted: order.isDeleted
                }))
              } as PromoOrderGroup;
            })
          )
        );

        // 3. Ждём все запросы
        return groupRequests.length > 0
          ? forkJoin(groupRequests)
          : of([]);
      })
    );
  }

  /**
   * Внутренний метод: получить группы (Filter)
   */
  private getGroups(
    page: number,
    pageSize: number
  ): Observable<FilterResponse<any>> {
    return this.http.post<FilterResponse<any>>(
      `${this.baseUrl}/PromoOrderGroup/Filter`,
      {
        filters: [],
        sorts: [],
        page,
        pageSize
      }
    );
  }

  /**
   * Внутренний метод: получить акции по groupId
   */
  private getOrdersByGroupId(groupId: string): Observable<FilterResponse<any>> {
    return this.http.post<FilterResponse<any>>(
      `${this.baseUrl}/PromoOrder/Filter`,
      {
        filters: [
          
        ],
        page: 0,
        pageSize: 50
      }
    );
  }


  getPromoOrderGroups(
    page = 0,
    pageSize = 10
  ): Observable<FilterResponse<PromoOrderGroup>> {
    return this.http.post<FilterResponse<PromoOrderGroup>>(
      `${this.baseUrl}/PromoOrderGroup/Filter`,
      {
        filters: [],
        sorts: [],
        page,
        pageSize
      }
    );
  }
}