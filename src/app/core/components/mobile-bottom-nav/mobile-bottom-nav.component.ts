import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../modules/auth/auth.service';
import { User, UserService } from '../../services/user.service';
import { Observable, map } from 'rxjs';

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

  userId$: Observable<string | null> = this.userService.user$.pipe(
    map((user: User | null) => user?.id ?? null)
  );


  getAuth() {
    this.authService.changeVisible(true);
  }

  changeTab(tab: string) {
    this.activeTab = tab;
  }

}
