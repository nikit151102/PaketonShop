import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { UserCardComponent } from './components/user-card/user-card.component';
import { MenuComponent } from './components/menu/menu.component';
import { AuthRoutingModule } from "../auth/auth-routing.module";
import { RouterOutlet } from '@angular/router';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-user',
  standalone: true,
  imports: [CommonModule, RouterOutlet, UserCardComponent, MenuComponent, AuthRoutingModule],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserComponent {
  currentUserData: any;

  constructor(private userService: UserService) { }

  ngOnInit(): void {
    this.userService.user$.subscribe((user: any) => {
      this.currentUserData = user;
    })
  }
}
