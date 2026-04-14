import { Injectable, signal, Signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  localStorageEnvironment,
  memoryCacheEnvironment,
  sessionStorageEnvironment,
} from '../../../environment';
import { HttpClient } from '@angular/common/http';
import { StorageUtils } from '../../../utils/storage.utils';

export interface User {
  id: string;
  fullName: string;
  email?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private userSubject: BehaviorSubject<User | null>;
  public user$: Observable<User | null>;


  public authUser = signal<boolean>(false);
  public isAuthUser = this.authUser.asReadonly();

  private basketsSignal = signal<any[] | null>(null);
  public baskets = this.basketsSignal.asReadonly();

  updateIsAuthUser(value: boolean): void {
    this.authUser.set(value);
  }

   updateBaskets(baskets: any[] | null): void {
    this.basketsSignal.set(baskets);
  }
  
  loadBaskets(): void {
    const baskets = StorageUtils.getMemoryCache(memoryCacheEnvironment.baskets.key);
    this.updateBaskets(Array.isArray(baskets) ? baskets : null);
  }

  constructor(private http: HttpClient) {
    const savedUser =
      sessionStorage.getItem(sessionStorageEnvironment.user.key) ||
      localStorage.getItem(localStorageEnvironment.user.key);

    this.userSubject = new BehaviorSubject<User | null>(
      savedUser ? JSON.parse(savedUser) : null,
    );
    this.user$ = this.userSubject.asObservable();
  }

  /**
   * Получить ключ хранилища по типу
   * @param storageType - 'local' | 'session', по умолчанию localStorage
   * @returns ключ для выбранного хранилища
   */
  private getStorageKey(storageType: 'local' | 'session') {
    return storageType === 'local'
      ? localStorageEnvironment.user.key
      : sessionStorageEnvironment.user.key;
  }

  /**
   * Получить текущее значение пользователя
   * @param storageType - 'local' | 'session', по умолчанию localStorage
   * @returns объект пользователя или null
   */
  getUser(storageType: 'local' | 'session' = 'local'): User | null {
    const storage = storageType === 'local' ? localStorage : sessionStorage;
    const key = this.getStorageKey(storageType);
    const savedUser = storage.getItem(key);
    return savedUser ? JSON.parse(savedUser) : this.userSubject.value;
  }

  /**
   * Обновить данные пользователя
   * @param user - новые данные
   * @param storageType - где хранить: 'local' | 'session', по умолчанию localStorage
   * @param saveToStorage - сохранять ли в storage, по умолчанию true
   */
  setUser(
    user: User | null,
    storageType: 'local' | 'session' = 'local',
    saveToStorage: boolean = true,
  ): void {
    this.userSubject.next(user);
    if (saveToStorage) {
      const storage = storageType === 'local' ? localStorage : sessionStorage;
      const key = this.getStorageKey(storageType);
      if (user) {
        storage.setItem(key, JSON.stringify(user));
      } else {
        storage.removeItem(key);
      }
    }
  }

  /**
   * Очистить данные пользователя
   * @param storageType - 'local' | 'session', по умолчанию localStorage
   */
  clearUser(storageType: 'local' | 'session' = 'local'): void {
    this.setUser(null, storageType);
  }

  /**
   * Пример запроса к API для получения данных пользователя
   * @returns Observable с данными пользователя
   */
  getDataUser(): Observable<any> {
    return this.http.get('');
  }



  public operativeInfo = signal<any>({});

  setOperativeInfo(value: boolean) {
    this.operativeInfo.set(value);
  }

  get getOperativeInfo(): boolean {
    return this.operativeInfo();
  }

}
