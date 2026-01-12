import { Component } from '@angular/core';
import { PartnerCardsComponent } from '../../components/partner-cards/partner-cards.component';

@Component({
  selector: 'app-companies',
  imports: [PartnerCardsComponent],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss'
})
export class CompaniesComponent {

}
