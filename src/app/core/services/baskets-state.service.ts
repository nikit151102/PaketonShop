import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { memoryCacheEnvironment } from '../../../environment';
import { StorageUtils } from '../../../utils/storage.utils';

@Injectable({ providedIn: 'root' })
export class BasketsStateService implements OnDestroy {
  private basketsSubject = new BehaviorSubject<any[] | null>(null);
  baskets$: Observable<any[] | null> = this.basketsSubject.asObservable();
  
  private cacheUnsubscribe: (() => void) | null = null;

  constructor() {
    this.initCacheSubscription();
  }

  private initCacheSubscription(): void {
    // Подписываемся на изменения кэша
    this.cacheUnsubscribe = StorageUtils.subscribeToCache(
      memoryCacheEnvironment.baskets.key,
      (data: any, key) => {
        console.log('BasketsStateService: кэш обновлен', data);
        this.basketsSubject.next(data || null);
      }
    );

    // Загружаем начальные данные
    const initialData: any = StorageUtils.getMemoryCache(memoryCacheEnvironment.baskets.key);
    if (initialData) {
      this.basketsSubject.next(initialData);
    }
  }

  getCurrentBaskets(): any[] | null {
    return this.basketsSubject.value;
  }

  updateBaskets(data: any[]): void {
    StorageUtils.setMemoryCache(
      memoryCacheEnvironment.baskets.key,
      data,
      memoryCacheEnvironment.baskets.ttl
    );
  }

  clearBaskets(): void {
    StorageUtils.clearMemoryCache(memoryCacheEnvironment.baskets.key);
  }

  ngOnDestroy(): void {
    if (this.cacheUnsubscribe) {
      this.cacheUnsubscribe();
    }
    this.basketsSubject.complete();
  }
}