import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-menu',
  imports: [RouterModule],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {

  constructor(private router: Router) { }

  logout() {
    // Здесь добавь логику выхода
    console.log('Выход пользователя');
    this.router.navigate(['/login']);
  }
}
