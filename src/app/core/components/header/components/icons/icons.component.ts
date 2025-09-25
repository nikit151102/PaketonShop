import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../../../modules/auth/auth.service';
import { NotificationsComponent } from './notifications/notifications.component';
import { StorageUtils } from '../../../../../../utils/storage.utils';
import { localStorageEnvironment, sessionStorageEnvironment } from '../../../../../../environment';
import { CommonModule } from '@angular/common';
import { UserService } from '../../../../services/user.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-icons',
  imports: [CommonModule, NotificationsComponent, RouterLink],
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss'
})
export class IconsComponent implements OnInit {

  userId: string = '';

  constructor(private authService: AuthService, private userService: UserService) { }

  ngOnInit(): void {
    this.userService.user$.subscribe((user: any) => {
      this.userId = user?.id ?? null;
    })
  }

  getAuth() {
    this.authService.changeVisible(true);
  }

}
