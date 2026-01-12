import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Partner {
  id: string;
  fullName?: string;
  shortName?: string;
  inn?: string;
  ogrn?: string;
  kpp?: string;
  address?: {
    country?: string;
    region?: string;
    city?: string;
    street?: string;
    house?: string;
    postIndex?: string;
  };
  lastName?: string;
  firstName?: string;
  middleName?: string;
  korAccount?: string;
  checkingAccount?: string;
  workDirection?: string;
  phoneNumber?: string;
  partnerTypeId?: string | number;
  email?: string;
  website?: string;
  createdAt?: string;
  updatedAt?: string;
  partner?: {
    id: string;
    shortName: string;
    fullName: string;
    inn: string;
    ogrn: string;
    kpp?: string;
    partnerTypeId?: string | number;
  };
  bank?: {
    id: string;
    code: string;
    bik: string;
    partner?: {
      shortName?: string;
    };
  };
}

@Component({
  selector: 'app-partner-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './partner-detail.component.html',
  styleUrls: ['./partner-detail.component.scss']
})
export class PartnerDetailComponent implements OnInit {
  @Input() partner!: Partner;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Partner>();

  activeTab: 'info' | 'contacts' | 'bank' = 'info';
  isClosing = false;
  showCopyNotification = false;
  isHidingCopyNotification = false;

  ngOnInit() {
    // Блокируем скролл на body при открытии модального окна
    document.body.style.overflow = 'hidden';
  }

  // Вспомогательные методы для безопасного доступа к данным
  getPartnerFullName(): string {
    return this.partner?.fullName || this.partner?.partner?.fullName || 'Нет названия';
  }

  getPartnerShortName(): string {
    return this.partner?.shortName || this.partner?.partner?.shortName || 'Нет краткого названия';
  }

  getPartnerINN(): string {
    return this.partner?.inn || this.partner?.partner?.inn || 'Не указан';
  }

  getPartnerOGRN(): string {
    return this.partner?.ogrn || this.partner?.partner?.ogrn || 'Не указан';
  }

  getPartnerKPP(): string {
    return this.partner?.kpp || this.partner?.partner?.kpp || '';
  }

  getPartnerWorkDirection(): string {
    return this.partner?.workDirection || 'Не указана';
  }

  getPartnerPhone(): string {
    return this.partner?.phoneNumber || '';
  }

  getPartnerEmail(): string {
    return this.partner?.email || '';
  }

  getPartnerTypeId(): string | number {
    return this.partner?.partnerTypeId || this.partner?.partner?.partnerTypeId || '';
  }

  getPartnerTypeText(): string {
    const typeId = this.getPartnerTypeId();
    if (typeId === 1 || typeId === '1') return 'Юридическое лицо';
    if (typeId === 2 || typeId === '2') return 'Физическое лицо';
    return 'Тип не указан';
  }

  getPartnerLogo(): string {
    const name = this.getPartnerShortName();
    return name.substring(0, 2).toUpperCase() || '??';
  }

  getContactFullName(): string {
    const lastName = this.partner?.lastName || '';
    const firstName = this.partner?.firstName || '';
    const middleName = this.partner?.middleName || '';
    
    const parts = [lastName, firstName, middleName].filter(part => part.trim());
    return parts.join(' ') || 'Контактное лицо не указано';
  }

  getContactInitials(): string {
    const name = this.getContactFullName();
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || '??';
  }

  getAddressField(field: string): string {
    return this.partner?.address?.[field as keyof typeof this.partner.address] || '';
  }

  hasAddress(): boolean {
    return !!this.partner?.address && 
           Object.values(this.partner.address).some(val => val && val.trim());
  }

  getBankName(): string {
    return this.partner?.bank?.partner?.shortName || '';
  }

  getBankBik(): string {
    return this.partner?.bank?.bik || '';
  }

  getBankAccount(): string {
    return this.partner?.checkingAccount || '';
  }

  getKorAccount(): string {
    return this.partner?.korAccount || '';
  }

  hasBankDetails(): boolean {
    return !!(this.getBankName() || this.getBankBik() || this.getBankAccount() || this.getKorAccount());
  }

  getCreationDate(): string {
    if (!this.partner?.createdAt) return 'Не указана';
    return new Date(this.partner.createdAt).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getUpdateDate(): string {
    if (!this.partner?.updatedAt) return 'Не указана';
    return new Date(this.partner.updatedAt).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getPartnerId(): string {
    return this.partner?.id || '';
  }

  formatPhoneNumber(phone: string): string {
    if (!phone) return 'Не указан';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
    } else if (cleaned.length === 10) {
      return `+7 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8)}`;
    }
    return phone;
  }

  // Методы взаимодействия
  setActiveTab(tab: 'info' | 'contacts' | 'bank'): void {
    this.activeTab = tab;
  }

  editPartner(): void {
    this.edit.emit(this.partner);
    this.closeModal();
  }

  closeModal(): void {
    this.isClosing = true;
    
    // Даем время для анимации закрытия
    setTimeout(() => {
      this.close.emit();
      document.body.style.overflow = '';
    }, 300);
  }

  copyCompanyInfo(): void {
    const info = this.getCompanyInfoText();
    
    navigator.clipboard.writeText(info).then(() => {
      this.showCopyNotification = true;
      
      // Скрываем уведомление через 3 секунды
      setTimeout(() => {
        this.isHidingCopyNotification = true;
        setTimeout(() => {
          this.showCopyNotification = false;
          this.isHidingCopyNotification = false;
        }, 300);
      }, 3000);
    }).catch(err => {
      console.error('Ошибка копирования: ', err);
    });
  }

  getCompanyInfoText(): string {
    return `
${this.getPartnerFullName()}
${this.getPartnerShortName()}

ИНН: ${this.getPartnerINN()}
ОГРН: ${this.getPartnerOGRN()}
${this.getPartnerKPP() ? `КПП: ${this.getPartnerKPP()}\n` : ''}

${this.getContactFullName()}
Телефон: ${this.formatPhoneNumber(this.getPartnerPhone())}
${this.getPartnerEmail() ? `Email: ${this.getPartnerEmail()}\n` : ''}

${this.hasAddress() ? `
Адрес:
${this.getAddressField('country') ? `${this.getAddressField('country')}, ` : ''}
${this.getAddressField('region') ? `${this.getAddressField('region')}, ` : ''}
${this.getAddressField('city') ? `г. ${this.getAddressField('city')}, ` : ''}
${this.getAddressField('street') ? `ул. ${this.getAddressField('street')}, ` : ''}
${this.getAddressField('house') ? `д. ${this.getAddressField('house')}` : ''}
${this.getAddressField('postIndex') ? `, ${this.getAddressField('postIndex')}` : ''}
` : ''}

${this.hasBankDetails() ? `
Банковские реквизиты:
${this.getBankName() ? `Банк: ${this.getBankName()}\n` : ''}
${this.getBankBik() ? `БИК: ${this.getBankBik()}\n` : ''}
${this.getBankAccount() ? `Расч. счет: ${this.getBankAccount()}\n` : ''}
${this.getKorAccount() ? `Корр. счет: ${this.getKorAccount()}` : ''}
` : ''}
    `.trim();
  }

  downloadCompanyInfo(): void {
    const info = this.getCompanyInfoText();
    const blob = new Blob([info], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `${this.getPartnerShortName().replace(/\s+/g, '_')}_реквизиты.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  shareCompanyInfo(): void {
    if (navigator.share) {
      navigator.share({
        title: this.getPartnerFullName(),
        text: this.getCompanyInfoText(),
        url: window.location.href
      }).catch(err => {
        console.log('Ошибка при использовании Web Share API:', err);
      });
    } else {
      this.copyCompanyInfo();
    }
  }
}