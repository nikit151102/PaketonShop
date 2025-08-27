import { Component } from '@angular/core';
import { PartnerCardsComponent } from './partner-cards/partner-cards.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoyaltyComponent } from './loyalty/loyalty.component';

@Component({
  selector: 'app-user-data',
  imports: [CommonModule, FormsModule, PartnerCardsComponent, LoyaltyComponent],
  templateUrl: './user-data.component.html',
  styleUrl: './user-data.component.scss'
})
export class UserDataComponent {
  user = {
    lastName: 'Иванов',
    firstName: 'Иван',
    middleName: 'Иванович',
    birthDate: '15.05.1990',
    phone: '+7 (999) 123-45-67',
    email: 'ivanov@example.com',
    registerDate: '01.01.2022',
    avatar: 'https://i.pravatar.cc/150'
  };


}
