import { Component, HostListener } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { UserService } from '../../../../core/services/user.service';
import { localStorageEnvironment } from '../../../../../environment';
import { StorageUtils } from '../../../../../utils/storage.utils';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu',
  imports: [RouterModule, CommonModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss',
})
export class MenuComponent {
  isMenuOpen = false;
  
  // Для демонстрации - можно получать из сервисов
  unreadOrdersCount = 2;
  unreadAnswersCount = 1;

  constructor(
    private router: Router,
    private userService: UserService,
  ) {}

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  closeMenuOnMobile(): void {
    if (window.innerWidth <= 768) {
      this.closeMenu();
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event): void {
    const window = event.target as Window;
    if (window.innerWidth > 768) {
      // На десктопе меню всегда открыто
      this.isMenuOpen = true;
    } else {
      // На мобильных закрываем при ресайзе
      this.isMenuOpen = false;
    }
  }

  ngOnInit(): void {
    // На десктопе меню открыто по умолчанию
    if (window.innerWidth > 768) {
      this.isMenuOpen = true;
    }
  }

  logout(): void {
    this.userService.clearUser();
    StorageUtils.removeLocalStorageCache(localStorageEnvironment.auth.key);
    this.router.navigate(['']);
  }

  // Методы для уведомлений
  getUnreadOrdersCount(): number {
    return this.unreadOrdersCount;
  }

  getUnreadAnswersCount(): number {
    return this.unreadAnswersCount;
  }
}