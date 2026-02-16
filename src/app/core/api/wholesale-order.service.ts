import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environment';

export interface WholesaleOrder {
  id?: string;
  orderDateTime: string;
  beginDateTime: string;
  endDateTime: string;
  partnerInstanceId: string;
  userInstanceId: string;
  // добавьте другие поля, которые возвращает API
}

export interface CreateWholesaleOrderDto {
  beginDateTime: string | null;
  endDateTime: string | null;
  partnerInstanceId: string;
  userInstanceId: string;
}

export interface FilterField {
  field: string;
  values: string[];
  type: number; // Тип фильтрации (0 - равно, 1 - содержит и т.д.)
}

export interface SortField {
  field: string;
  sortType: number; // 0 - ASC, 1 - DESC
}

export interface QueryDto {
  filters: FilterField[];
  sorts: SortField[];
  page: number;
  pageSize: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class WholesaleOrderService {
  private readonly baseUrl = `${environment.production}/api/Entities/WholesaleOrder`;

  constructor(private http: HttpClient) { }

  /**
   * Создание новой заявки на оптовые цены
   * POST /api/Entities/WholesaleOrder
   * @param orderData - данные для создания заявки
   * @returns Observable с созданной заявкой
   */
  createOrder(orderData: CreateWholesaleOrderDto): Observable<any> {
    return this.http.post<any>(this.baseUrl, orderData);
  }

  /**
   * Получение заявок по фильтру с пагинацией и сортировкой
   * POST /api/Entities/WholesaleOrder/Filter
   * @param query - параметры фильтрации, сортировки и пагинации
   * @returns Observable с пагинированным списком заявок
   */
  getOrdersByFilter(query: QueryDto): Observable<PaginatedResponse<WholesaleOrder>> {
    return this.http.post<PaginatedResponse<WholesaleOrder>>(`${this.baseUrl}/Filter`, query);
  }

  /**
   * Добавление документов к существующей заявке
   * PUT /api/Entities/WholesaleOrder/AddDocuments/{id}
   * @param id - идентификатор заявки
   * @param files - массив файлов для загрузки
   * @returns Observable с результатом операции
   */
  addDocuments(id: string, files: File[]): Observable<any> {
    const formData = new FormData();
    
    files.forEach((file, index) => {
      formData.append(`files`, file, file.name);
    });

    return this.http.put(`${this.baseUrl}/AddDocuments/${id}`, formData);
  }

  /**
   * Получение заявки по ID
   * GET /api/Entities/WholesaleOrder/{id}
   * @param id - идентификатор заявки
   * @returns Observable с данными заявки
   */
  getOrderById(id: string): Observable<WholesaleOrder> {
    return this.http.get<WholesaleOrder>(`${this.baseUrl}/${id}`);
  }

  /**
   * Обновление заявки
   * PUT /api/Entities/WholesaleOrder/{id}
   * @param id - идентификатор заявки
   * @param orderData - данные для обновления
   * @returns Observable с обновленной заявкой
   */
  updateOrder(id: string, orderData: Partial<CreateWholesaleOrderDto>): Observable<WholesaleOrder> {
    return this.http.put<WholesaleOrder>(`${this.baseUrl}/${id}`, orderData);
  }

  /**
   * Удаление заявки
   * DELETE /api/Entities/WholesaleOrder/{id}
   * @param id - идентификатор заявки
   * @returns Observable с результатом удаления
   */
  deleteOrder(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Получение всех заявок (без фильтрации)
   * @returns Observable со списком всех заявок
   */
  getAllOrders(): Observable<WholesaleOrder[]> {
    // Используем фильтр для получения всех записей
    const query: QueryDto = {
      filters: [],
      sorts: [{ field: 'orderDateTime', sortType: 1 }], // Сортировка по убыванию даты
      page: 0,
      pageSize: 1000 // Максимальный размер страницы
    };
    return this.http.post<WholesaleOrder[]>(`${this.baseUrl}/Filter`, query);
  }

  /**
   * Поиск заявок по датам
   * @param startDate - начальная дата
   * @param endDate - конечная дата
   * @returns Observable со списком заявок в указанном диапазоне дат
   */
  getOrdersByDateRange(startDate: Date, endDate: Date): Observable<PaginatedResponse<WholesaleOrder>> {
    const query: QueryDto = {
      filters: [
        {
          field: 'orderDateTime',
          values: [startDate.toISOString(), endDate.toISOString()],
          type: 3 // Тип "между"
        }
      ],
      sorts: [{ field: 'orderDateTime', sortType: 1 }],
      page: 0,
      pageSize: 100
    };
    return this.http.post<PaginatedResponse<WholesaleOrder>>(`${this.baseUrl}/Filter`, query);
  }

  /**
   * Поиск заявок по партнеру
   * @param partnerInstanceId - ID партнера
   * @param page - номер страницы
   * @param pageSize - размер страницы
   * @returns Observable с пагинированным списком заявок партнера
   */
  getOrdersByPartner(partnerInstanceId: string, page: number = 0, pageSize: number = 20): Observable<PaginatedResponse<WholesaleOrder>> {
    const query: QueryDto = {
      filters: [
        {
          field: 'partnerInstanceId',
          values: [partnerInstanceId],
          type: 0 // Равно
        }
      ],
      sorts: [{ field: 'orderDateTime', sortType: 1 }],
      page: page,
      pageSize: pageSize
    };
    return this.http.post<PaginatedResponse<WholesaleOrder>>(`${this.baseUrl}/Filter`, query);
  }

  /**
   * Поиск заявок по пользователю
   * @param userInstanceId - ID пользователя
   * @param page - номер страницы
   * @param pageSize - размер страницы
   * @returns Observable с пагинированным списком заявок пользователя
   */
  getOrdersByUser(userInstanceId: string, page: number = 0, pageSize: number = 20): Observable<PaginatedResponse<WholesaleOrder>> {
    const query: QueryDto = {
      filters: [
        {
          field: 'userInstanceId',
          values: [userInstanceId],
          type: 0 // Равно
        }
      ],
      sorts: [{ field: 'orderDateTime', sortType: 1 }],
      page: page,
      pageSize: pageSize
    };
    return this.http.post<PaginatedResponse<WholesaleOrder>>(`${this.baseUrl}/Filter`, query);
  }
}