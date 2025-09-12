import { Component, Input } from '@angular/core';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-user-card',
  imports: [],
  templateUrl: './user-card.component.html',
  styleUrl: './user-card.component.scss'
})
export class UserCardComponent {
  @Input() currentUserData: any;
}
