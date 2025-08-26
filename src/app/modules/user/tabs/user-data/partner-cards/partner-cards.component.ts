import { AfterViewInit, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Partner } from '../../../../../../models/partner.interface';
import { CommonModule } from '@angular/common';
import { PartnerDetailComponent } from './partner-detail/partner-detail.component';

@Component({
  selector: 'app-partner-cards',
  imports: [CommonModule, PartnerDetailComponent],
  templateUrl: './partner-cards.component.html',
  styleUrl: './partner-cards.component.scss'
})
export class PartnerCardsComponent implements AfterViewInit {
  @Input() partners: Partner[] = [
    {
      id: 1,
      fullName: 'ООО Ромашка',
      shortName: 'Ромашка',
      inn: '1234567890',
      ogrn: '1023456789012',
      kpp: '123456789',
      address: { id: 1, region: 'Москва', city: 'Москва', street: 'Ленина', house: '10', postIndex: '123456' },
      partnerTypeId: 1,
      lastName: 'Иванов',
      firstName: 'Иван',
      middleName: 'Иванович',
      korAccount: '30101810400000000225',
      workDirection: 'Торговля',
      phoneNumber: '+7 (999) 123-45-67',
      addressId: 1
    },
    {
      id: 1,
      fullName: 'ООО Ромашка',
      shortName: 'Ромашка',
      inn: '1234567890',
      ogrn: '1023456789012',
      kpp: '123456789',
      address: { id: 1, region: 'Москва', city: 'Москва', street: 'Ленина', house: '10', postIndex: '123456' },
      partnerTypeId: 1,
      lastName: 'Иванов',
      firstName: 'Иван',
      middleName: 'Иванович',
      korAccount: '30101810400000000225',
      workDirection: 'Торговля',
      phoneNumber: '+7 (999) 123-45-67',
      addressId: 1
    },
    {
      id: 1,
      fullName: 'ООО Ромашка',
      shortName: 'Ромашка',
      inn: '1234567890',
      ogrn: '1023456789012',
      kpp: '123456789',
      address: { id: 1, region: 'Москва', city: 'Москва', street: 'Ленина', house: '10', postIndex: '123456' },
      partnerTypeId: 1,
      lastName: 'Иванов',
      firstName: 'Иван',
      middleName: 'Иванович',
      korAccount: '30101810400000000225',
      workDirection: 'Торговля',
      phoneNumber: '+7 (999) 123-45-67',
      addressId: 1
    },
    {
      id: 1,
      fullName: 'ООО Ромашка',
      shortName: 'Ромашка',
      inn: '1234567890',
      ogrn: '1023456789012',
      kpp: '123456789',
      address: { id: 1, region: 'Москва', city: 'Москва', street: 'Ленина', house: '10', postIndex: '123456' },
      partnerTypeId: 1,
      lastName: 'Иванов',
      firstName: 'Иван',
      middleName: 'Иванович',
      korAccount: '30101810400000000225',
      workDirection: 'Торговля',
      phoneNumber: '+7 (999) 123-45-67',
      addressId: 1
    },
    {
      id: 1,
      fullName: 'ООО Ромашка',
      shortName: 'Ромашка',
      inn: '1234567890',
      ogrn: '1023456789012',
      kpp: '123456789',
      address: { id: 1, region: 'Москва', city: 'Москва', street: 'Ленина', house: '10', postIndex: '123456' },
      partnerTypeId: 1,
      lastName: 'Иванов',
      firstName: 'Иван',
      middleName: 'Иванович',
      korAccount: '30101810400000000225',
      workDirection: 'Торговля',
      phoneNumber: '+7 (999) 123-45-67',
      addressId: 1
    },
    {
      id: 1,
      fullName: 'ООО Ромашка',
      shortName: 'Ромашка',
      inn: '1234567890',
      ogrn: '1023456789012',
      kpp: '123456789',
      address: { id: 1, region: 'Москва', city: 'Москва', street: 'Ленина', house: '10', postIndex: '123456' },
      partnerTypeId: 1,
      lastName: 'Иванов',
      firstName: 'Иван',
      middleName: 'Иванович',
      korAccount: '30101810400000000225',
      workDirection: 'Торговля',
      phoneNumber: '+7 (999) 123-45-67',
      addressId: 1
    },
  ];


  @ViewChild('scrollWrapper') scrollWrapper!: ElementRef<HTMLDivElement>;
  @ViewChild('progressBar') progressBar!: ElementRef<HTMLDivElement>;

  ngAfterViewInit() {
    const wrapper = this.scrollWrapper.nativeElement;
    wrapper.addEventListener('scroll', () => {
      const scrollPercent = (wrapper.scrollLeft / (wrapper.scrollWidth - wrapper.clientWidth)) * 100;
      this.progressBar.nativeElement.style.width = scrollPercent + '%';
    });
  }

  scrollLeft() {
    this.scrollWrapper.nativeElement.scrollBy({ left: -300, behavior: 'smooth' });
  }

  scrollRight() {
    this.scrollWrapper.nativeElement.scrollBy({ left: 300, behavior: 'smooth' });
  }

  selectedPartner: Partner | null = null;

  openPartner(partner: Partner) {
    this.selectedPartner = partner;
  }

  closePartner() {
    this.selectedPartner = null;
  }

}
