import { Component } from '@angular/core';
import { AuthService } from '../../../../../modules/auth/auth.service';

@Component({
  selector: 'app-icons',
  imports: [],
  templateUrl: './icons.component.html',
  styleUrl: './icons.component.scss'
})
export class IconsComponent {

  constructor(private authService: AuthService) { }
  
  getAuth() {
    this.authService.changeVisible(true);
  }

}
