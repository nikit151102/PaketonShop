import { Component } from '@angular/core';
import { PartnerCardsComponent } from './partner-cards/partner-cards.component';

@Component({
  selector: 'app-user-data',
  imports: [PartnerCardsComponent],
  templateUrl: './user-data.component.html',
  styleUrl: './user-data.component.scss'
})
export class UserDataComponent {

}
