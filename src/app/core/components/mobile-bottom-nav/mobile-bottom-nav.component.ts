import { CommonModule } from '@angular/common';
import { Component, inject, HostListener, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../modules/auth/auth.service';
import { User, UserService } from '../../services/user.service';
import { Observable, map, take } from 'rxjs';
import { StorageUtils } from '../../../../utils/storage.utils';
import {
  localStorageEnvironment,
  sessionStorageEnvironment,
} from '../../../../environment';
import { UserApiService } from '../../api/user.service';

@Component({
  selector: 'app-mobile-bottom-nav',
  imports: [CommonModule, RouterLink],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrl: './mobile-bottom-nav.component.scss',
})
export class MobileBottomNavComponent {
  activeTab: string = 'home';
  isMenuOpen = false;
  
  // Объявляем массив с SafeHtml
  menuItems: Array<{label: string, icon: SafeHtml, link: string}> = [];

  private userService = inject(UserService);
  private authService = inject(AuthService);
  private userApiService = inject(UserApiService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  constructor() {
    // Инициализируем меню с безопасным HTML
    this.initMenuItems();
  }

  private initMenuItems() {
    const icons = [
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 21H5C3.89543 21 3 20.1046 3 19V5C3 3.89543 3.89543 3 5 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21Z" 
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 8H7V10H9V8Z" fill="currentColor"/>
        <path d="M9 12H7V14H9V12Z" fill="currentColor"/>
        <path d="M9 16H7V18H9V16Z" fill="currentColor"/>
        <path d="M17 8H11V10H17V8Z" fill="currentColor"/>
        <path d="M17 12H11V14H17V12Z" fill="currentColor"/>
        <path d="M17 16H11V18H17V16Z" fill="currentColor"/>
      </svg>`,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 5H5C3.89543 5 3 5.89543 3 7V17C3 18.1046 3.89543 19 5 19H19C20.1046 19 21 18.1046 21 17V7C21 5.89543 20.1046 5 19 5Z" 
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M3 9H21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M7 13H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M7 17H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M15 13H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M15 17H17" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 10C21 8.89543 20.1046 8 19 8H5C3.89543 8 3 8.89543 3 10V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V10Z" 
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8 8V5C8 3.89543 8.89543 3 10 3H14C15.1046 3 16 3.89543 16 5V8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M12 18V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>`,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 10C21 17 12 23 12 23C12 23 3 17 3 10C3 7.61305 3.94821 5.32387 5.63604 3.63604C7.32387 1.94821 9.61305 1 12 1C14.3869 1 16.6761 1.94821 18.364 3.63604C20.0518 5.32387 21 7.61305 21 10Z" 
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="10" r="3" fill="currentColor"/>
      </svg>`,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 7H4C2.89543 7 2 7.89543 2 9V19C2 20.1046 2.89543 21 4 21H20C21.1046 21 22 20.1046 22 19V9C22 7.89543 21.1046 7 20 7Z" 
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 21V5C16 3.89543 15.1046 3 14 3H10C8.89543 3 8 3.89543 8 5V21" stroke="currentColor" stroke-width="1.5"/>
        <path d="M12 7V7.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 11V11.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 15V15.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>`,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z" 
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="currentColor"/>
      </svg>`,
      `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" 
              stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M14 2V8H20" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 13H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M16 17H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M10 9H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>`
    ];

    const labels = [
      'О компании',
      'Новости и акции', 
      'Магазины', 
      'Контакты', 
      'Для бизнеса',
      'Политика конфиденциальности', 
      'Публичная оферта'
    ];

    const links = [
      '/about',
      '/news',
      '/stores',
      '/contacts',
      '/business',
      '/privacy',
      '/offer'
    ];

    this.menuItems = labels.map((label, index) => ({
      label,
      icon: this.sanitizer.bypassSecurityTrustHtml(icons[index]),
      link: links[index]
    }));
  }


  userId$: Observable<string | null> = this.userService.user$.pipe(
    map((user: User | null) => user?.id ?? null),
  );

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    this.activeTab = this.isMenuOpen ? 'menu' : 'home';
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.activeTab = 'home';
  }

  navigateTo(link: string) {
    this.router.navigate([link]);
    this.closeMenu();
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.menu-button') && !target.closest('.menu-overlay')) {
      this.closeMenu();
    }
  }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 956) {
      this.closeMenu();
    }
  }

  getAuth() {
    const authToken = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.auth.key,
    );

    if (!authToken) {
      this.authService.changeVisible(true);
      return;
    }

    this.userId$.pipe(take(1)).subscribe((userId) => {
      if (userId) {
        this.router.navigate(['/profile']);
        return;
      }

      const userData = StorageUtils.getSessionStorage<User>(
        sessionStorageEnvironment.user.key,
      );
      if (userData && userData.id) {
        this.router.navigate(['/profile']);
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
            this.router.navigate(['/profile']);
          } else {
            this.authService.changeVisible(true);
          }
        });
    });
  }

  changeTab(tab: string) {
    this.activeTab = tab;
    const authToken = StorageUtils.getLocalStorageCache(
      localStorageEnvironment.auth.key,
    );

    if (tab == 'favorites') {
      if (!authToken) {
        this.authService.changeVisible(true);
        return;
      } else {
        this.router.navigate(['/profile/favorites']);
      }
    }
    if (tab == 'cart') {
      if (!authToken) {
        this.authService.changeVisible(true);
        return;
      } else {
        this.router.navigate(['/cart']);
      }
    }
  }
}