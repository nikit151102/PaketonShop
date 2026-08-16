import { Component, computed, inject, OnInit } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { User, UserService } from '../../../../services/user.service';
import { Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { UserApiService } from '../../../../api/user.service';
import { StorageUtils } from '../../../../../../utils/storage.utils';
import {
  localStorageEnvironment,
  sessionStorageEnvironment,
} from '../../../../../../environment';

@Component({
  selector: 'app-icons',
  imports: [CommonModule],
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss',
})
export class IconsComponent implements OnInit {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private userApiService = inject(UserApiService);
  private router = inject(Router);

  userId$: Observable<string | null> = this.userService.user$.pipe(
    map((user: User | null) => user?.id ?? null),
  );

  operativeInfo = computed(() => this.userService.operativeInfo());

  private readonly guestAllowedPages = ['/cart', '/profile/favorites'];

  ngOnInit(): void {
    if (this.isObjectEmpty(this.operativeInfo()) && StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key)) {
      this.userApiService.getOperativeInfo();
    }
  }

  private isObjectEmpty(obj: any): boolean {
    return obj && Object.keys(obj).length === 0 && obj.constructor === Object;
  }

  goToPage(page: string) {
    const authToken = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.auth.key,
    ) as string | null;
    
    const isGuestToken = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.isGuestToken.key,
    ) as boolean | null;

    const isProfilePage = page === '/profile';
    const isGuestAllowed = this.guestAllowedPages.includes(page);

    // 1. Нет токена - пользователь не авторизован
    if (!authToken) {
      if (isProfilePage) {
        this.authService.setRedirectingToProfile(true);
      }
      this.authService.changeVisible(true);
      return;
    }

    // 2. Есть токен - проверяем, гость это или полноценный пользователь
    // Смотрим ТОЛЬКО на флаг isGuestToken
    const isGuest = isGuestToken === true;

    // 3. Если это гость
    if (isGuest) {
      // Проверяем, разрешен ли доступ к этой странице для гостя
      if (isGuestAllowed) {
        // Гостю разрешен доступ к корзине и избранному
        this.router.navigate([page]);
        return;
      } else if (isProfilePage) {
        // Запрещаем доступ к профилю для гостях
        this.authService.changeVisible(true);
        return;
      } else {
        // Запрещаем доступ к другим страницам для гостя
        this.authService.changeVisible(true);
        return;
      }
    }
    // Полный пользователь имеет доступ ко всем страницам
    this.router.navigate([page]);
  }
}