import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Address } from '../../../models/address.interface';
import { ApiResponse } from '../../../models/address.interface';
import { environment } from '../../../environment';

@Injectable({
  providedIn: 'root'
})
export class AddressesService {

 private readonly baseUrl = `${environment.production}/api/Profile/Addresses`;

  constructor(private http: HttpClient) {}

  /**
   * Получить список адресов (Filter)
   */
  getAddresses(): Observable<ApiResponse<Address[]>> {
    return this.http.post<ApiResponse<Address[]>>(`${this.baseUrl}/Filter`, {});
  }

  /**
   * Получить один адрес по id
   */
  getAddress(id: string): Observable<ApiResponse<Address>> {
    return this.http.get<ApiResponse<Address>>(`${this.baseUrl}/${id}`);
  }

  /**
   * Создать новый адрес
   */
  createAddress(address: Address): Observable<ApiResponse<Address>> {
    return this.http.post<ApiResponse<Address>>(this.baseUrl, address);
  }

  /**
   * Обновить существующий адрес
   */
  updateAddress(address: Address): Observable<ApiResponse<Address>> {
    return this.http.put<ApiResponse<Address>>(this.baseUrl, address);
  }

  /**
   * Удалить адрес по id
   */
  deleteAddress(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
  
}
