import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { NotificationsComponent } from './notifications/notifications.component';
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
export class IconsComponent {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private userApiService = inject(UserApiService);
  private router = inject(Router);

  userId$: Observable<string | null> = this.userService.user$.pipe(
    map((user: User | null) => user?.id ?? null),
  );

  goToPage(page: string) {

    const authToken = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.auth.key,
    );

    console.log('authToken', authToken)
    if (!authToken) {
      this.authService.changeVisible(true);
      return;
    }

    this.userId$.pipe(take(1)).subscribe((userId) => {
      if (userId) {
        this.router.navigate([page]);
        return;
      }

      const userData = StorageUtils.getSessionStorage<User>(
        sessionStorageEnvironment.user.key,
      );
      if (userData && userData.id) {
        this.router.navigate([page]);
        return;
      }

      this.userApiService
        .getData()
        .pipe(take(1))
        .subscribe((data: any) => {
          if (data?.data?.id) {
            StorageUtils.setSessionStorage(
              sessionStorageEnvironment.user.key,
              data.data,
            );
            this.router.navigate([page]);
          } else {
            this.authService.changeVisible(true);
          }
        });
    });


  }
}
