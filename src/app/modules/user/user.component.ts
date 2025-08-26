import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { UserCardComponent } from './components/user-card/user-card.component';
import { MenuComponent } from './components/menu/menu.component';
import { AuthRoutingModule } from "../auth/auth-routing.module";
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-user',
  imports: [CommonModule, RouterOutlet, UserCardComponent, MenuComponent, AuthRoutingModule],
  templateUrl: './user.component.html',
  styleUrl: './user.component.scss'
})
export class UserComponent {

}
