import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { delay, Observable } from 'rxjs';
import { environment } from '../../../environment';

export interface PaymentResponse {
  data: {
    confirmationToken: string;
    id?: string;
    createDateTime?: string;
    changeDateTime?: string;
    delta?: number;
    paymentStatus?: string;
    description?: string;
  };
  message?: string;
  status?: string;
}

export interface TransactionData {
  id?: string;
  createDateTime?: string;
  changeDateTime?: string;
  delta: number;
  paymentStatus: string;
  description: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {

  private readonly baseUrl = `${environment.production}/api`;

  constructor(private http: HttpClient) { }

  /**
   * Создание транзакции для пополнения баланса
   * @param amount Сумма пополнения
   * @returns Observable с confirmationToken
   */
  createTopUpTransaction(amount: number): Observable<PaymentResponse> {
    return this.http.put<PaymentResponse>(`${this.baseUrl}/Profile/MakeTransaction`, {
      delta: amount
    });
  }


  payForTheOrderTransaction(id: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Entities/DeliveryOrder/PayForTheOrder/${id}`, {});
  }

  getTransactions(requestData?: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/Profile/GetTransactions`, requestData || {
      filters: [],
      sorts: [],
      page: 0,
      pageSize: 20
    });
  }

  /**
   * Создание транзакции для оплаты товара/услуги
   * @param productId ID товара
   * @param amount Сумма оплаты
   * @param additionalData Дополнительные данные
   */
  createPaymentTransaction(
    productId: string | number,
    amount: number,
    additionalData?: any
  ): Observable<PaymentResponse> {
    return this.http.post<PaymentResponse>(`${this.baseUrl}/create`, {
      productId,
      amount,
      currency: 'RUB',
      ...additionalData
    });
  }

  /**
   * Подтверждение успешной оплаты
   * @param confirmationToken Токен подтверждения
   * @returns Observable с обновленными данными
   */
  confirmPayment(confirmationToken: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/confirm`, { confirmationToken });
  }

  /**
   * Проверка статуса платежа
   * @param paymentId ID платежа
   */
  checkPaymentStatus(paymentId: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/status/${paymentId}`);
  }

  /**
   * Отмена платежа
   * @param paymentId ID платежа
   */
  cancelPayment(paymentId: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/cancel/${paymentId}`, {});
  }

}