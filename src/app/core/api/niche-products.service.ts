import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

// Интерфейсы для DTO
export interface NewsBannerFilterDto {
  filters?: FilterField[];
  sorts?: SortField[];
  page?: number;
  pageSize?: number;
}

export interface FilterField {
  field: string;
  values: any[];
  type: number;
}

export interface SortField {
  field: string;
  sortType: SortType;
}

export enum SortType {
  Ascending = 0,
  Descending = 1
}

@Injectable({
  providedIn: 'root'
})
export class NicheProductsService {
  private readonly baseUrl = `${environment.production}/api/Entities/ProductNiche`;

  constructor(private http: HttpClient) { }

  /**
   * Получение списка новостных баннеров по фильтру
   * @param filterDto - DTO с фильтрами, сортировкой и пагинацией
   */
  getNewsBannersByFilter(filterDto: NewsBannerFilterDto): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/Filter`, 
      filterDto
    );
  }

  /**
   * Получение подробной информации по конкретному новостному баннеру
   * @param id - UUID новостного баннера
   */
  getNewsBannerById(id: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

}