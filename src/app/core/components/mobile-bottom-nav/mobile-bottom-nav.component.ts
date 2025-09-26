import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../modules/auth/auth.service';
import { User, UserService } from '../../services/user.service';
import { Observable, map, take } from 'rxjs';
import { StorageUtils } from '../../../../utils/storage.utils';
import { localStorageEnvironment, sessionStorageEnvironment } from '../../../../environment';
import { UserApiService } from '../../api/user.service';

@Component({
  selector: 'app-mobile-bottom-nav',
  imports: [CommonModule, RouterLink],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrl: './mobile-bottom-nav.component.scss'
})
export class MobileBottomNavComponent {
  activeTab: string = 'home';

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


  changeTab(tab: string) {
    this.activeTab = tab;
  }

}
