import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment, localStorageEnvironment } from '../../../environment';
import { StorageUtils } from '../../../utils/storage.utils';
@Injectable({
  providedIn: 'root'
})
export class ProductsService {

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {

    const token = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'accept': 'text/plain'
    });
  }

  getAll(filters: any[], sort: any = null, page: number = 0, pageSize: number = 20) {
    const requestBody = {
      filters: filters,   // Фильтры могут быть переданы как массив объектов
      sort: sort,          // Параметры сортировки 
      page: page,         // Номер страницы
      pageSize: pageSize // Количество элементов на странице
    };

    return this.http.post<any>(
      `${environment.production}/Entities/ProductInstance/Filter`,
      requestBody,
      { headers: this.getHeaders() }
    );
  }

  getById(id: string) {
    return this.http.post<any>(
      `${environment.production}/Entities/ProductInstance`,
      {
        id: id,
        productCategoryId: ""
      },
      {
        headers: this.getHeaders(),
      }
    );
  }
}
