import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment, localStorageEnvironment } from '../../../environment';
import { StorageUtils } from '../../../utils/storage.utils';

export interface SearchResponse {
  message: string;
  status: number;
  data: ProductInstance[];
  breadCrumbs: any;
}

export interface ProductInstance {
  id: string;
  fullName: string;
  article: string;
  description: string;
  price: number;
  properties: Record<string, string>;
}

export interface SearchRequest {
  filters?: any[];
  page?: number;
  pageSize?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ProductsService {
  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.auth.key,
    );
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      accept: 'text/plain',
    });
  }

  // Поиск продуктов с фильтрацией
  searchProducts(request: SearchRequest): Observable<SearchResponse> {

    return this.http.post<SearchResponse>(
      `${environment.production}/api/Entities/ProductInstanceSearch/Filter`,
      request,
      { headers: this.getHeaders() }
    );
  }

  // Автокомплит для поиска (если API поддерживает)
  searchAutocomplete(query: SearchRequest): Observable<SearchResponse> {
    return this.http.post<SearchResponse>(
      `${environment.production}/api/Entities/ProductInstanceSearch/Filter`,
      query,
      { headers: this.getHeaders() }
    );
  }

  getAll(
    filters: any[],
    sort: any = null,
    page: number = 0,
    pageSize: number = 20,
  ) {
    const requestBody = {
      filters: filters,
      sort: sort,
      page: page,
      pageSize: pageSize,
    };
    // /api/Entities/ProductInstanceSearch/Filter
    return this.http.post<any>(
      `${environment.production}/api/Entities/ProductInstance/Filter`,
      requestBody,
      { headers: this.getHeaders() },
    );
  }

  getAllSearch(
    filters: any[],
    sort: any = null,
    page: number = 0,
    pageSize: number = 20,
  ) {
    const requestBody = {
      filters: filters,
      sort: sort,
      page: page,
      pageSize: pageSize,
    };
    return this.http.post<any>(
      `${environment.production}/api/Entities/ProductInstanceSearch/Filter`,
      requestBody,
      { headers: this.getHeaders() },
    );
  }

  getById(id: string) {
    return this.http.post<any>(
      `${environment.production}/api/Entities/ProductInstance/ByCategory`,
      {
        id: id,
      },
      {
        headers: this.getHeaders(),
      },
    );
  }
}