import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { StorageUtils } from '../../../utils/storage.utils';
import { localStorageEnvironment } from '../../../environment';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private userService: UserService
  ) { }

  canActivate(): Promise<boolean> {
    return new Promise((resolve) => {
      const token = localStorage.getItem('YXV0aFRva2Vu');
      const idUser = localStorage.getItem('VXNlcklk');

      if (!idUser) {
        this.handleUnauthorizedAccess('Данные пользователя не найдены.');
        return resolve(false);
      }

      if (!token) {
        this.handleUnauthorizedAccess('Токен не найден. Войдите снова.');
        return resolve(false);
      }

      this.userService.getDataUser().subscribe({ //Доделать запрос
        next: (response) => {
          if (response.data) {
            if (response.data.id === idUser) {
              localStorage.setItem(localStorageEnvironment.user.key, response.data.id);
              this.userService.setUser(response.data, false);
              resolve(true);
            } else {
              this.handleUnauthorizedAccess('Не удалось получить данные о пользователе. Попробуйте снова');
              resolve(false);
            }
          } else {
            this.handleUnauthorizedAccess('Не удалось получить данные о пользователе. Попробуйте снова');
            resolve(false);
          }
        },
        error: (err: any) => {
          this.handleUnauthorizedAccess('Сеанс истек. Пожалуйста, войдите снова.');
          resolve(false);
        },
      });

    });
  }

  private utf8ToBase64(str: string): string {
    const utf8Bytes = new TextEncoder().encode(str);
    let binary = '';
    utf8Bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  private handleUnauthorizedAccess(message: string): void {
    this.userService.clearUser();
    StorageUtils.removeLocalStorageCache(localStorageEnvironment.user.key);
    this.router.navigate(['']);
  }

}
