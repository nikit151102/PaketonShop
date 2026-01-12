import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserApiService } from '../../../../core/api/user.service';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  selector: 'app-profile',
  imports: [RouterModule, CommonModule],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  animations: [
    trigger('staggerAnimation', [
      transition(':enter', [
        query('.profile-menu-card', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('500ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
              style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ])
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('600ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
          style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class ProfileComponent implements OnInit {
  user: any = null;
  favoriteCount: number = 0;
  addressCount: number = 0;
  unreadOrdersCount: number = 2;
  unreadAnswersCount: number = 1;
  isLoading: boolean = true;
  isMobile: boolean = false;

  constructor(private userApiService: UserApiService) {}

  ngOnInit(): void {
    this.checkScreenSize();
    this.loadUserData();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize(): void {
    this.isMobile = window.innerWidth <= 768;
  }

  loadUserData(): void {
    this.isLoading = true;
    this.userApiService.getData().subscribe({
      next: (response) => {
        this.user = response.data;
        this.isLoading = false;
        
        // Здесь можно добавить загрузку дополнительных данных
        // Например, количество избранного и адресов через другие сервисы
        this.simulateAdditionalData();
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this.isLoading = false;
      }
    });
  }

  private simulateAdditionalData(): void {
    // Симуляция загрузки дополнительных данных
    setTimeout(() => {
      this.favoriteCount = Math.floor(Math.random() * 50);
      this.addressCount = Math.floor(Math.random() * 5) + 1;
    }, 300);
  }

  editAvatar(): void {
    // Логика изменения аватара
    console.log('Edit avatar');
    // Можно реализовать загрузку файла
  }

  // Дополнительные методы для улучшения UX
  getFormattedDate(dateString: string): string {
    if (!dateString) return 'Не указана';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getUserInitials(): string {
    if (!this.user) return 'П';
    const first = this.user.firstName?.charAt(0) || '';
    const last = this.user.lastName?.charAt(0) || '';
    return (first + last).toUpperCase() || 'П';
  }
}