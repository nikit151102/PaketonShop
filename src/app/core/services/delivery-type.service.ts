import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';
import { DeliveryType } from '../../../models/address.interface';

@Injectable({
  providedIn: 'root'
})

@Injectable({
  providedIn: 'root'
})
export class DeliveryTypeService {
  private apiUrl = `${environment.production}/api/Entities/DeliveryType`;

  constructor(private http: HttpClient) {}

  /**
   * Получение всех типов доставки
   */
  getDeliveryTypes(): Observable<{
    message: string;
    status: number;
    data: DeliveryType[];
  }> {
    return this.http.get<{
      message: string;
      status: number;
      data: DeliveryType[];
    }>(this.apiUrl);
  }

  /**
   * Получение типа доставки по ID
   */
  getDeliveryTypeById(id: string): Observable<{
    message: string;
    status: number;
    data: DeliveryType;
  }> {
    return this.http.get<{
      message: string;
      status: number;
      data: DeliveryType;
    }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Получение доступных типов доставки для заказа
   */
  getAvailableDeliveryTypes(orderId: string): Observable<{
    message: string;
    status: number;
    data: DeliveryType[];
  }> {
    return this.http.get<{
      message: string;
      status: number;
      data: DeliveryType[];
    }>(`${this.apiUrl}/available/${orderId}`);
  }

  /**
   * Расчет стоимости доставки
   */
  calculateDeliveryCost(deliveryTypeId: string, addressId: string, orderTotal: number): Observable<{
    message: string;
    status: number;
    data: {
      deliveryTypeId: string;
      cost: number;
      estimatedDays: number;
      available: boolean;
      restrictions?: string[];
    };
  }> {
    return this.http.post<{
      message: string;
      status: number;
      data: {
        deliveryTypeId: string;
        cost: number;
        estimatedDays: number;
        available: boolean;
        restrictions?: string[];
      };
    }>(`${this.apiUrl}/calculate-cost`, {
      deliveryTypeId,
      addressId,
      orderTotal
    });
  }
}