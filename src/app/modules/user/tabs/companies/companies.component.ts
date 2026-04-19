import { Component } from '@angular/core';
import { PartnerCardsComponent } from '../../components/partner-cards/partner-cards.component';
import { TitleComponent } from '../../../../core/components/title/title.component';

@Component({
  selector: 'app-companies',
  imports: [PartnerCardsComponent, TitleComponent],
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.scss'
})
export class CompaniesComponent {

}
