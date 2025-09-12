import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { localStorageEnvironment } from '../../../environment';
import { HttpClient } from '@angular/common/http';

export interface User {
  id: string;
  fullName: string;
  email?: string;
  [key: string]: any;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private userSubject: BehaviorSubject<User | null>;

  public user$: Observable<User | null>;

  constructor(private http: HttpClient) {
    const savedUser = localStorage.getItem(localStorageEnvironment.user.key);
    this.userSubject = new BehaviorSubject<User | null>(savedUser ? JSON.parse(savedUser) : null);
    this.user$ = this.userSubject.asObservable();
  }

  /**
   * Получить текущее значение пользователя
   */
  getUser(): User | null {
    return this.userSubject.value;
  }

  /**
   * Обновить данные пользователя
   * @param user - новые данные
   * @param saveToStorage - сохранять ли в localStorage (по умолчанию true)
   */
  setUser(user: User | null, saveToStorage: boolean = true): void {
    this.userSubject.next(user);
    if (saveToStorage) {
      if (user) {
        localStorage.setItem(localStorageEnvironment.user.key, JSON.stringify(user));
      } else {
        localStorage.removeItem(localStorageEnvironment.user.key);
      }
    }
  }

  /**
   * Очистить данные пользователя
   */
  clearUser(): void {
    this.setUser(null);
  }


  
  getDataUser(): Observable<any> {
    return this.http.get('')
  }
}
