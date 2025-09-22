import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../modules/auth/auth.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-mobile-bottom-nav',
  imports: [CommonModule, RouterLink],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrl: './mobile-bottom-nav.component.scss'
})
export class MobileBottomNavComponent {
  activeTab: string = 'home';
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

  changeTab(tab: string) {
    this.activeTab = tab;
  }

}
