import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../../../../modules/auth/auth.service';
import { NotificationsComponent } from './notifications/notifications.component';
import { StorageUtils } from '../../../../../../utils/storage.utils';
import { localStorageEnvironment, sessionStorageEnvironment } from '../../../../../../environment';
import { CommonModule } from '@angular/common';
import { User, UserService } from '../../../../services/user.service';
import { RouterLink } from '@angular/router';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-icons',
  imports: [CommonModule, NotificationsComponent, RouterLink],
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss'
})
export class IconsComponent {
  private userService = inject(UserService);
  private authService = inject(AuthService);

  userId$: Observable<string | null> = this.userService.user$.pipe(
    map((user: User | null) => user?.id ?? null)
  );

  getAuth(): void {
    this.authService.changeVisible(true);
  }

}
