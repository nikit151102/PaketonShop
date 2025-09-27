import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Partner } from '../../../../../../models/partner.interface';
import { CommonModule } from '@angular/common';
import { PartnerDetailComponent } from './partner-detail/partner-detail.component';
import { PartnerFormComponent } from './partner-form/partner-form.component';

@Component({
  selector: 'app-partner-cards',
  imports: [CommonModule, PartnerDetailComponent, PartnerFormComponent],
  templateUrl: './partner-cards.component.html',
  styleUrl: './partner-cards.component.scss'
})
export class PartnerCardsComponent {

  companies = [
    {
      FullName: 'ООО "ТехноСервис"',
      ShortName: 'ТехноСервис',
      Inn: '7701234567',
      Ogrn: '1157746123456',
      Kpp: '770101001',
      Address: 'г. Москва, ул. Ленина, д. 10',
      LastName: 'Иванов',
      FirstName: 'Иван',
      MiddleName: 'Иванович',
      KorAccount: '30101810400000000225',
      CheckingAccount: '40702810900000001234',
      WorkDirection: 'IT услуги',
      PhoneNumber: '+7 (495) 123-45-67'
    },
    {
      FullName: 'АО "СтройГрупп"',
      ShortName: 'СтройГрупп',
      Inn: '7707654321',
      Ogrn: '1167746123789',
      Kpp: '770701001',
      Address: 'г. Санкт-Петербург, пр. Невский, д. 25',
      LastName: 'Петров',
      FirstName: 'Петр',
      MiddleName: 'Сергеевич',
      KorAccount: '30101810400000000230',
      CheckingAccount: '40702810900000005678',
      WorkDirection: 'Строительство',
      PhoneNumber: '+7 (812) 987-65-43'
    },
    {
      FullName: 'АО "СтройГрупп"',
      ShortName: 'СтройГрупп',
      Inn: '7707654321',
      Ogrn: '1167746123789',
      Kpp: '770701001',
      Address: 'г. Санкт-Петербург, пр. Невский, д. 25',
      LastName: 'Петров',
      FirstName: 'Петр',
      MiddleName: 'Сергеевич',
      KorAccount: '30101810400000000230',
      CheckingAccount: '40702810900000005678',
      WorkDirection: 'Строительство',
      PhoneNumber: '+7 (812) 987-65-43'
    },
    {
      FullName: 'АО "СтройГрупп"',
      ShortName: 'СтройГрупп',
      Inn: '7707654321',
      Ogrn: '1167746123789',
      Kpp: '770701001',
      Address: 'г. Санкт-Петербург, пр. Невский, д. 25',
      LastName: 'Петров',
      FirstName: 'Петр',
      MiddleName: 'Сергеевич',
      KorAccount: '30101810400000000230',
      CheckingAccount: '40702810900000005678',
      WorkDirection: 'Строительство',
      PhoneNumber: '+7 (812) 987-65-43'
    },
    {
      FullName: 'АО "СтройГрупп"',
      ShortName: 'СтройГрупп',
      Inn: '7707654321',
      Ogrn: '1167746123789',
      Kpp: '770701001',
      Address: 'г. Санкт-Петербург, пр. Невский, д. 25',
      LastName: 'Петров',
      FirstName: 'Петр',
      MiddleName: 'Сергеевич',
      KorAccount: '30101810400000000230',
      CheckingAccount: '40702810900000005678',
      WorkDirection: 'Строительство',
      PhoneNumber: '+7 (812) 987-65-43'
    }
  ];

  activePartner: any = null;

  detailPartner(data: any) {
    this.activePartner = data;
  }

  closePartnerDetail() {
    this.activePartner = null;
  }
}
