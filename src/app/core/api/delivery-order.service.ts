import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { DeliveryType } from '../../../models/address.interface';
import { DeliveryOrderCreateDto, DeliveryOrderCreateResponse, DeliveryOrderDetailResponse, DeliveryOrderUpdateDto, DeliveryOrderUpdateResponse, FilterParams, DeliveryOrderListResponse } from '../../../models/delivery-order.interface';


@Injectable({
  providedIn: 'root'
})
export class DeliveryOrderService {
  private apiUrl = `${environment.production}/api/Entities/DeliveryOrder`;

  constructor(private http: HttpClient) { }

  /**
   * Создание нового заказа
   */
  createOrder(orderData: DeliveryOrderCreateDto): Observable<DeliveryOrderCreateResponse> {
    return this.http.post<DeliveryOrderCreateResponse>(this.apiUrl, orderData);
  }

  /**
   * Получение заказа по ID
   */
  getOrderById(id: string): Observable<DeliveryOrderDetailResponse> {
    return this.http.get<DeliveryOrderDetailResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Обновление существующего заказа
   */
  updateOrder(id: string, orderData: DeliveryOrderUpdateDto): Observable<DeliveryOrderUpdateResponse> {
    return this.http.put<DeliveryOrderUpdateResponse>(`${this.apiUrl}/${id}`, orderData);
  }

  /**
   * Удаление заказа по ID
   */
  deleteOrder(id: string): Observable<{ message: string; status: number }> {
    return this.http.delete<{ message: string; status: number }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Получение списка заказов с фильтрацией
   */
  getOrders(page: number, pageSize: number): Observable<any> {
    const requestBody = {
      filters: [],
      page: page,
      pageSize: pageSize
    };


    return this.http.post<DeliveryOrderListResponse>(`${environment.production}/api/Profile/UserDeliveryOrders/Filter`, requestBody);
  }

  /**
   * Получение заказов текущего пользователя
   */
  getUserOrders(): Observable<DeliveryOrderListResponse> {
    return this.http.get<DeliveryOrderListResponse>(`${this.apiUrl}/user/current`);
  }

  /**
   * Изменение статуса заказа
   */
  changeOrderStatus(orderId: string, status: number): Observable<{ message: string; status: number }> {
    return this.http.patch<{ message: string; status: number }>(
      `${this.apiUrl}/${orderId}/status`,
      { status }
    );
  }

  /**
   * Добавление промокода к заказу
   */
  addPromoCode(orderId: string, promoCodeId: string): Observable<DeliveryOrderDetailResponse> {
    return this.http.post<DeliveryOrderDetailResponse>(
      `${this.apiUrl}/${orderId}/promocode`,
      { promoCodeId }
    );
  }

  /**
   * Удаление промокода из заказа
   */
  removePromoCode(orderId: string): Observable<DeliveryOrderDetailResponse> {
    return this.http.delete<DeliveryOrderDetailResponse>(`${this.apiUrl}/${orderId}/promocode`);
  }

  /**
   * Обновление адреса доставки заказа
   */
  updateDeliveryAddress(orderId: string, addressId: string): Observable<DeliveryOrderDetailResponse> {
    return this.http.patch<DeliveryOrderDetailResponse>(
      `${this.apiUrl}/${orderId}/address`,
      { addressId }
    );
  }

  /**
   * Обновление типа доставки заказа
   */
  updateDeliveryType(orderId: string, deliveryTypeId: string): Observable<DeliveryOrderDetailResponse> {
    return this.http.patch<DeliveryOrderDetailResponse>(
      `${this.apiUrl}/${orderId}/delivery-type`,
      { deliveryTypeId }
    );
  }

  /**
   * Отмена заказа
   */
  cancelOrder(orderId: string): Observable<{ message: string; status: number }> {
    return this.http.post<{ message: string; status: number }>(
      `${this.apiUrl}/${orderId}/cancel`,
      {}
    );
  }

  /**
   * Получение статистики по заказам
   */
  getOrderStats(): Observable<{
    message: string;
    status: number;
    data: {
      totalOrders: number;
      pendingOrders: number;
      processingOrders: number;
      deliveredOrders: number;
      cancelledOrders: number;
      totalRevenue: number;
      averageOrderValue: number;
    };
  }> {
    return this.http.get<{
      message: string;
      status: number;
      data: {
        totalOrders: number;
        pendingOrders: number;
        processingOrders: number;
        deliveredOrders: number;
        cancelledOrders: number;
        totalRevenue: number;
        averageOrderValue: number;
      };
    }>(`${this.apiUrl}/stats`);
  }

  /**
   * Экспорт заказов в CSV
   */
  exportOrdersToCSV(params?: FilterParams): Observable<Blob> {
    let httpParams = new HttpParams();

    if (params) {
      if (params.filters && params.filters.length > 0) {
        httpParams = httpParams.set('filters', JSON.stringify(params.filters));
      }
      if (params.sorts && params.sorts.length > 0) {
        httpParams = httpParams.set('sorts', JSON.stringify(params.sorts));
      }
    }

    return this.http.get(`${this.apiUrl}/export/csv`, {
      params: httpParams,
      responseType: 'blob'
    });
  }

  /**
   * Получение истории изменений заказа
   */
  getOrderHistory(orderId: string): Observable<{
    message: string;
    status: number;
    data: Array<{
      id: string;
      action: string;
      description: string;
      userId: string;
      userName: string;
      timestamp: string;
      changes?: any;
    }>;
  }> {
    return this.http.get<{
      message: string;
      status: number;
      data: Array<{
        id: string;
        action: string;
        description: string;
        userId: string;
        userName: string;
        timestamp: string;
        changes?: any;
      }>;
    }>(`${this.apiUrl}/${orderId}/history`);
  }

  /**
   * Отправка уведомления о заказе
   */
  sendOrderNotification(orderId: string, notificationType: string): Observable<{ message: string; status: number }> {
    return this.http.post<{ message: string; status: number }>(
      `${this.apiUrl}/${orderId}/notify`,
      { notificationType }
    );
  }

  /**
   * Получение доступных статусов заказа
   */
  getOrderStatuses(): Observable<{
    message: string;
    status: number;
    data: Array<{
      id: number;
      code: string;
      name: string;
      description: string;
      color: string;
      isFinal: boolean;
    }>;
  }> {
    return this.http.get<{
      message: string;
      status: number;
      data: Array<{
        id: number;
        code: string;
        name: string;
        description: string;
        color: string;
        isFinal: boolean;
      }>;
    }>(`${this.apiUrl}/statuses`);
  }

  /**
   * Создание черновика заказа
   */
  createDraft(orderData: Partial<DeliveryOrderCreateDto>): Observable<DeliveryOrderCreateResponse> {
    return this.http.post<DeliveryOrderCreateResponse>(`${this.apiUrl}/draft`, orderData);
  }

  /**
   * Копирование заказа
   */
  copyOrder(orderId: string): Observable<DeliveryOrderCreateResponse> {
    return this.http.post<DeliveryOrderCreateResponse>(`${this.apiUrl}/${orderId}/copy`, {});
  }

  /**
   * Получение сводной информации о заказе
   */
  getOrderSummary(orderId: string): Observable<{
    message: string;
    status: number;
    data: {
      id: string;
      orderNumber: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      totalAmount: number;
      status: string;
      createdAt: string;
      itemsCount: number;
      deliveryType: string;
      deliveryAddress: string;
      paymentStatus: string;
    };
  }> {
    return this.http.get<{
      message: string;
      status: number;
      data: {
        id: string;
        orderNumber: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        totalAmount: number;
        status: string;
        createdAt: string;
        itemsCount: number;
        deliveryType: string;
        deliveryAddress: string;
        paymentStatus: string;
      };
    }>(`${this.apiUrl}/${orderId}/summary`);
  }

  /**
   * Валидация заказа перед созданием
   */
  validateOrder(orderData: DeliveryOrderCreateDto): Observable<{
    message: string;
    status: number;
    data: {
      isValid: boolean;
      errors: string[];
      warnings: string[];
      suggestions: string[];
    };
  }> {
    return this.http.post<{
      message: string;
      status: number;
      data: {
        isValid: boolean;
        errors: string[];
        warnings: string[];
        suggestions: string[];
      };
    }>(`${this.apiUrl}/validate`, orderData);
  }

  /**
   * Быстрое создание заказа (упрощенная форма)
   */
  quickCreate(orderData: {
    userBasketId: string;
    deliveryTypeId: string;
    consultation?: boolean;
  }): Observable<DeliveryOrderCreateResponse> {
    return this.http.post<DeliveryOrderCreateResponse>(`${this.apiUrl}/quick`, orderData);
  }

  /**
   * Получение шаблонов заказов
   */
  getOrderTemplates(): Observable<{
    message: string;
    status: number;
    data: Array<{
      id: string;
      name: string;
      description: string;
      template: Partial<DeliveryOrderCreateDto>;
      isDefault: boolean;
    }>;
  }> {
    return this.http.get<{
      message: string;
      status: number;
      data: Array<{
        id: string;
        name: string;
        description: string;
        template: Partial<DeliveryOrderCreateDto>;
        isDefault: boolean;
      }>;
    }>(`${this.apiUrl}/templates`);
  }

  /**
   * Применение шаблона к заказу
   */
  applyTemplate(orderId: string, templateId: string): Observable<DeliveryOrderDetailResponse> {
    return this.http.post<DeliveryOrderDetailResponse>(
      `${this.apiUrl}/${orderId}/apply-template`,
      { templateId }
    );
  }
}
