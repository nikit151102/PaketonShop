import { Component, inject } from '@angular/core';
import { AuthService } from '../../../../../modules/auth/auth.service';
import { NotificationsComponent } from './notifications/notifications.component';
import { CommonModule } from '@angular/common';
import { User, UserService } from '../../../../services/user.service';
import { Router, RouterLink } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { UserApiService } from '../../../../api/user.service';
import { StorageUtils } from '../../../../../../utils/storage.utils';
import { localStorageEnvironment, sessionStorageEnvironment } from '../../../../../../environment';

@Component({
  selector: 'app-icons',
  imports: [CommonModule, NotificationsComponent, RouterLink],
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss'
})
export class IconsComponent {
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private userApiService = inject(UserApiService);
  private router = inject(Router)
  
  userId$: Observable<string | null> = this.userService.user$.pipe(
    map((user: User | null) => user?.id ?? null)
  );

  getAuth() {
    const authToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);

    if (!authToken) {
      this.authService.changeVisible(true);
      return;
    }

    this.userId$.pipe(take(1)).subscribe((userId) => {
      if (userId) {
        this.router.navigate(['/profile', userId]);
        return;
      }

      const userData = StorageUtils.getSessionStorage<User>(sessionStorageEnvironment.user.key);
      if (userData && userData.id) {
        this.router.navigate(['/profile', userData.id]);
        return;
      }

      this.userApiService.getData().pipe(take(1)).subscribe((data: any) => {
        if (data?.data?.id) {
          StorageUtils.setSessionStorage(sessionStorageEnvironment.user.key, data.data);
          this.router.navigate(['/profile', data.data.id]);
        } else {
          this.authService.changeVisible(true);
        }
      });
    });
  }

}
