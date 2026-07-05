import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environment';

// ==================== ИНТЕРФЕЙСЫ ====================

export interface StoreAddress {
  id: string;
  region: string;
  area: string;
  city: string;
  street: string;
  house: string;
  housing?: string | null;
  office?: string;
  latitude: number;
  longitude: number;
  postIndex?: string;
  floorNumber?: string;
  isDeleted?: boolean;
}

export interface WorkingHour {
  id: string;
  dateTime?: string | null;
  dayOfWeek: number; // 0 = Вс, 1 = Пн, ..., 6 = Сб
  openTime: string;  // "09:00:00"
  closeTime: string; // "19:00:00"
  isDeleted?: boolean;
}

export interface StoreSchedule {
  id: string;
  storeId: string;
  workingHours: WorkingHour[];
  exceptionDays?: any[];
  isDeleted?: boolean;
}

export interface Store {
  id: string;
  shortName: string;
  fullName: string;
  address: StoreAddress;
  phoneNumber?: string | null;
  email?: string | null;
  productPlaceType: number;
  advantageList: string[];
  getInstructions: string[];
  storeSchedule?: StoreSchedule | null;
  imageInstanceLinks: string[];
  isDeleted: boolean;
  partner?: any;
  isDeliveryIncluded?: boolean | null;
}

export interface StoreApiResponse {
  message: string;
  status: number;
  pageCount: number;
  totalCount: number | null;
  data: Store[];
}

export type StoreCategory = 'Магазин' | 'Склад' | 'Офис';

interface StoreFilterRequest {
  filters: Array<{ field: string; values: any[]; type: number }>;
  sorts: Array<{ field: string; sortType: number }>;
  page: number;
  pageSize: number;
}

// ==================== СЕРВИС ====================

@Injectable({ providedIn: 'root' })
export class StoreService {
  private readonly API_URL = `${environment.production}/api/Entities/ProductPlace`;

  readonly cityCoordinates: Record<string, [number, number]> = {
    'Барнаул': [53.347, 83.777],
    'Новоалтайск': [53.4126, 83.93452],
    'Заринск': [53.72221, 84.93135],
    'Алейск': [52.49553, 82.77649],
    'Белокуриха': [52.00031, 84.96466],
    'Бийск': [52.52499, 85.16533],
    'Сростки': [52.423463, 85.708648],
    'Рубцовск': [51.52199, 81.20287],
    'Славгород': [52.99247, 78.64597],
    'Камень на Оби': [53.79234, 81.31771],
    'Майма': [52.00338, 85.89214],
    'Новокузнецк': [53.76495, 87.16553],
    'Новосибирск': [55.0043, 82.93339],
    'Бердск': [54.755208, 83.087181],
    'Омск': [54.980366, 73.344592],
    'Томск': [56.498999, 84.956801],
    'Тюмень': [57.152985, 65.541227],
  };

  constructor(private http: HttpClient) {}

  /** Получить все магазины */
  getAllStores(): Observable<Store[]> {
    const request: StoreFilterRequest = {
      filters: [],
      sorts: [{ field: 'shortName', sortType: 0 }],
      page: 0,
      pageSize: 1000
    };

    return this.http.post<StoreApiResponse>(`${this.API_URL}/Filter`, request).pipe(
      map(response => response.data || []),
      catchError(error => {
        console.error('Ошибка загрузки магазинов:', error);
        return of([]);
      })
    );
  }

  /** Получить уникальные города */
  getCities(stores: Store[]): string[] {
    const cities = new Set(stores.map(store => store.address.city));
    return Array.from(cities).sort();
  }

  /** Получить координаты города */
  getCityCoordinates(city: string): [number, number] {
    return this.cityCoordinates[city] || [55.76, 37.64];
  }

  /** Построить полный адрес */
  getFullAddress(store: Store): string {
    const addr = store.address;
    const parts = [
      addr.city,
      addr.street,
      addr.house ? `д. ${addr.house}` : '',
      addr.housing ? `к. ${addr.housing}` : '',
      addr.office ? `оф. ${addr.office}` : '',
    ].filter(Boolean);
    return parts.join(', ');
  }

  /** Получить массив рабочих часов магазина */
  private getWorkingHours(store: Store): WorkingHour[] {
    if (!store.storeSchedule?.workingHours) return [];
    return store.storeSchedule.workingHours.filter(h => !h.isDeleted);
  }

  /** Форматировать время (убираем секунды) */
  formatTime(time: string): string {
    if (!time) return '';
    if (time.includes(':')) {
      const parts = time.split(':');
      return `${parts[0]}:${parts[1]}`;
    }
    return time;
  }

  /** Форматировать расписание для отображения */
  formatSchedule(store: Store): string {
    const hours = this.getWorkingHours(store);
    if (hours.length === 0) return '';

    // Группируем по времени работы
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    const grouped = new Map<string, number[]>();

    hours.forEach(h => {
      const timeStr = `${this.formatTime(h.openTime)} — ${this.formatTime(h.closeTime)}`;
      if (!grouped.has(timeStr)) {
        grouped.set(timeStr, []);
      }
      grouped.get(timeStr)!.push(h.dayOfWeek);
    });

    if (grouped.size === 0) return '';

    // Формируем компактный текст
    const parts: string[] = [];
    grouped.forEach((daysList, timeStr) => {
      // Сортируем дни недели по порядку
      const sorted = [...daysList].sort((a, b) => a - b);
      
      if (sorted.length === 7) {
        parts.push(`Ежедневно ${timeStr}`);
      } else if (sorted.length >= 2) {
        // Проверяем, идут ли дни подряд
        const dayNames = sorted.map(d => days[d]);
        parts.push(`${dayNames.join(', ')}: ${timeStr}`);
      } else {
        parts.push(`${days[sorted[0]]}: ${timeStr}`);
      }
    });

    return parts.join('; ');
  }

  /** Проверить, открыт ли магазин сейчас */
  isOpenNow(store: Store): boolean | null {
    const hours = this.getWorkingHours(store);
    if (hours.length === 0) return null;

    const now = new Date();
    const currentDay = now.getDay(); // 0 = Вс, 1 = Пн, ...
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const todaySchedule = hours.find(h => h.dayOfWeek === currentDay);
    if (!todaySchedule || !todaySchedule.openTime || !todaySchedule.closeTime) {
      return null;
    }

    const open = this.formatTime(todaySchedule.openTime);
    const close = this.formatTime(todaySchedule.closeTime);

    return currentTime >= open && currentTime <= close;
  }
}