import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, BehaviorSubject, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environment';
import {
  QueryDto,
  ProductPlaceListResponse,
  ProductPlaceFilterParams,
  ProductPlaceDetailResponse,
  Coordinates,
  StoreDistance,
  StoreHoursInfo,
  TodaySchedule,
  ProductPlace
} from '../../../models/product-place.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductPlaceService {
  private apiUrl = `${environment.production}/api/Entities/ProductPlace`;
  
  // BehaviorSubjects для хранения данных
  private productPlacesSubject = new BehaviorSubject<ProductPlace[]>([]);
  private selectedStoreSubject = new BehaviorSubject<ProductPlace | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  
  // Observable для подписок
  productPlaces$ = this.productPlacesSubject.asObservable();
  selectedStore$ = this.selectedStoreSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  
  // Кэш
  private storesCache = new Map<string, ProductPlace>();

  constructor(private http: HttpClient) {}

  /**
   * Получить все точки реализации
   */
  getAllProductPlaces(pageSize: number = 100): Observable<ProductPlace[]> {
    this.loadingSubject.next(true);
    
    const query: QueryDto = {
      filters: [],
      sorts: [{ propertyName: 'fullName', direction: 'Ascending' }],
      page: 0,
      pageSize: pageSize
    };

    return this.http.post<ProductPlaceListResponse>(`${this.apiUrl}/Filter`, query).pipe(
      map(response => response.data),
      tap(stores => {
        this.productPlacesSubject.next(stores);
        this.updateCache(stores);
      }),
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        console.error('Error fetching product places:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  /**
   * Получить точки реализации с фильтрацией
   */
 getFilteredProductPlaces(params: ProductPlaceFilterParams): Observable<ProductPlace[]> {
    this.loadingSubject.next(true);
    
    const filters: Array<{
      propertyName: string;
      value: any;
      comparison: 'Equals' | 'Contains' | 'GreaterThan' | 'LessThan' | 'StartsWith' | 'EndsWith';
    }> = [];
    
    if (params.city) {
      filters.push({
        propertyName: 'address.city',
        value: params.city,
        comparison: 'Equals' as const
      });
    }
    
    if (params.region) {
      filters.push({
        propertyName: 'address.region',
        value: params.region,
        comparison: 'Equals' as const
      });
    }
    
    if (params.searchText) {
      filters.push({
        propertyName: 'fullName',
        value: params.searchText,
        comparison: 'Contains' as const
      });
    }

    const query: QueryDto = {
      filters,
      sorts: [{ propertyName: 'fullName', direction: 'Ascending' as const }],
      page: 0,
      pageSize: 50
    };

    return this.http.post<ProductPlaceListResponse>(`${this.apiUrl}/Filter`, query).pipe(
      map(response => response.data),
      tap(stores => {
        this.productPlacesSubject.next(stores);
        this.updateCache(stores);
      }),
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        console.error('Error fetching filtered product places:', error);
        this.loadingSubject.next(false);
        return of([]);
      })
    );
  }

  /**
   * Получить точку реализации по ID
   */
  getProductPlaceById(id: string): Observable<ProductPlace | null> {
    // Проверяем кэш
    const cachedStore = this.storesCache.get(id);
    if (cachedStore) {
      this.selectedStoreSubject.next(cachedStore);
      return of(cachedStore);
    }

    this.loadingSubject.next(true);
    
    return this.http.get<ProductPlaceDetailResponse>(`${this.apiUrl}/${id}`).pipe(
      map(response => response.data),
      tap(store => {
        this.selectedStoreSubject.next(store);
        this.storesCache.set(id, store);
      }),
      tap(() => this.loadingSubject.next(false)),
      catchError(error => {
        console.error(`Error fetching product place with id ${id}:`, error);
        this.loadingSubject.next(false);
        return of(null);
      })
    );
  }

  /**
   * Получить точки реализации в городе
   */
  getStoresByCity(city: string): Observable<ProductPlace[]> {
    return this.getFilteredProductPlaces({ city });
  }

  /**
   * Получить все уникальные города
   */
  getAllCities(): Observable<string[]> {
    return this.productPlaces$.pipe(
      map(stores => {
        const cities = stores
          .map(store => store.address?.city || '')
          .filter((city, index, self) => city && self.indexOf(city) === index);
        return cities.sort();
      })
    );
  }

  /**
   * Получить все уникальные регионы
   */
  getAllRegions(): Observable<string[]> {
    return this.productPlaces$.pipe(
      map(stores => {
        const regions = stores
          .map(store => store.address?.region || '')
          .filter((region, index, self) => region && self.indexOf(region) === index);
        return regions.sort();
      })
    );
  }

  /**
   * Найти ближайшие магазины
   */
  findNearestStores(
    userCoords: Coordinates,
    radiusKm: number = 10
  ): Observable<StoreDistance[]> {
    return this.productPlaces$.pipe(
      map(stores => {
        return stores
          .map(store => {
            const distance = this.calculateDistance(
              userCoords.latitude,
              userCoords.longitude,
              store.address?.latitude || 0,
              store.address?.longitude || 0
            );
            
            return {
              ...store,
              distance: Math.round(distance * 1000) // в метрах
            };
          })
          .filter(store => store.distance! <= radiusKm * 1000)
          .sort((a, b) => (a.distance || 0) - (b.distance || 0));
      })
    );
  }

  /**
   * Получить информацию о графике работы
   */
  getStoreHoursInfo(store: ProductPlace): StoreHoursInfo[] {
    const daysOfWeek = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const today = new Date().getDay(); // 0 - Sunday, 1 - Monday, etc.
    
    const workingHours = store.storeSchedule?.workingHours || [];
    
    return workingHours.map(hours => ({
      dayOfWeek: hours.dayOfWeek,
      dayName: daysOfWeek[hours.dayOfWeek] || `День ${hours.dayOfWeek}`,
      openTime: this.formatTime(hours.openTime),
      closeTime: this.formatTime(hours.closeTime),
      isWorkingDay: hours.openTime !== '00:00:00' && hours.closeTime !== '00:00:00',
      isToday: hours.dayOfWeek === today
    })).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  /**
   * Получить график работы на сегодня
   */
  getTodaySchedule(store: ProductPlace): TodaySchedule {
    const today = new Date();
    const todayDayOfWeek = today.getDay();
    const todayDateStr = today.toISOString().split('T')[0];
    
    // Проверяем исключительные дни
    const exceptionDays = store.storeSchedule?.exceptionDays || [];
    const exceptionDay = exceptionDays.find(
      exception => exception.date === todayDateStr
    );
    
    if (exceptionDay) {
      return {
        isOpen: !exceptionDay.isClosed && exceptionDay.openTime !== null,
        openTime: exceptionDay.openTime ? this.formatTime(exceptionDay.openTime) : undefined,
        closeTime: exceptionDay.closeTime ? this.formatTime(exceptionDay.closeTime) : undefined,
        exception: exceptionDay
      };
    }
    
    // Проверяем обычное расписание
    const workingHours = store.storeSchedule?.workingHours || [];
    const todayHours = workingHours.find(
      hours => hours.dayOfWeek === todayDayOfWeek
    );
    
    if (!todayHours || todayHours.openTime === '00:00:00') {
      return { isOpen: false };
    }
    
    // Проверяем текущее время
    const currentTime = today.toTimeString().split(' ')[0]; // "HH:mm:ss"
    const isOpen = currentTime >= todayHours.openTime && currentTime <= todayHours.closeTime;
    
    return {
      isOpen,
      openTime: this.formatTime(todayHours.openTime),
      closeTime: this.formatTime(todayHours.closeTime)
    };
  }

  /**
   * Получить полный адрес точки
   */
  getFullAddress(store: ProductPlace): string {
    const addr = store.address;
    if (!addr) return '';
    
    let address = '';
    
    if (addr.city) address += `г.${addr.city}`;
    if (addr.street) address += `, ул.${addr.street}`;
    if (addr.house) address += `, ${addr.house}`;
    if (addr.housing) address += `, корп.${addr.housing}`;
    if (addr.office) address += `, оф.${addr.office}`;
    
    return address || store.fullName || '';
  }

  /**
   * Очистить кэш
   */
  clearCache(): void {
    this.storesCache.clear();
  }

  /**
   * Сбросить выбранную точку
   */
  clearSelectedStore(): void {
    this.selectedStoreSubject.next(null);
  }

  // Приватные методы
  private updateCache(stores: ProductPlace[]): void {
    stores.forEach(store => {
      this.storesCache.set(store.id, store);
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Радиус Земли в км
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return value * Math.PI / 180;
  }

  private formatTime(timeString: string): string {
    if (!timeString) return '';
    return timeString.slice(0, 5); // "HH:mm"
  }
}