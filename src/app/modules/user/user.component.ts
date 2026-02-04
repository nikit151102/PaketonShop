import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink } from '@angular/router';
import { UserService } from '../../core/services/user.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink
],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss',
})
export class UserComponent implements OnInit {
  currentUserData: any;
  showHeader: boolean = true;

  constructor(
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userService.user$.subscribe((user: any) => {
      console.log('user', user);
      this.currentUserData = user;
    });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd)
      )
      .subscribe(() => {
        this.updateHeaderVisibility();
      });

    this.updateHeaderVisibility();
  }

  private updateHeaderVisibility(): void {
    const currentUrl = this.router.url;
    
    this.showHeader = !currentUrl.includes('/profile/profile');
  }
}