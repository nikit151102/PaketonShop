import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { AuthRoutingModule } from "../../../../auth/auth-routing.module";

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
    building?: string;
    apartment?: string;
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
      fullName?: string;
    };
  };
  userInstances?: Array<{
    firstName: string;
    lastName: string;
    middleName: string;
    avatarUrl?: string;
  }>;
}

@Component({
  selector: 'app-partner-detail',
  standalone: true,
  imports: [CommonModule, AuthRoutingModule],
  templateUrl: './partner-detail.component.html',
  styleUrls: ['./partner-detail.component.scss'],
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95) translateY(20px)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 0, transform: 'scale(0.95) translateY(20px)' }))
      ])
    ]),
    trigger('fadeAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideAnimation', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('250ms ease-out', 
          style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ])
  ]
})
export class PartnerDetailComponent implements OnInit, OnDestroy {
  @Input() partner!: Partner;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Partner>();
  @Output() createContract = new EventEmitter<Partner>();
  @Output() sendDocuments = new EventEmitter<Partner>();

  activeTab: 'overview' | 'details' | 'bank' | 'documents' = 'overview';
  isClosing = false;
  showCopyNotification = false;
  showFullId = false;
  copyTimer: any;
  
  // Для анимации карточек
  hoveredBlock: string | null = null;

  ngOnInit() {
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
    if (this.copyTimer) clearTimeout(this.copyTimer);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeModal();
  }

  // Основные методы получения данных
  getCompanyName(): string {
    return this.partner?.fullName || this.partner?.partner?.fullName || 'Без названия';
  }

  getCompanyShortName(): string {
    return this.partner?.shortName || this.partner?.partner?.shortName || this.getCompanyInitials();
  }

  getCompanyInitials(): string {
    const name = this.getCompanyName();
    const words = name.split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase() || '??';
  }

  getCompanyLogoColor(): string {
    const colors = [
      '#3c8a27', '#2d6a1f', '#4CAF50', '#388E3C', '#2E7D32',
      '#1B5E20', '#00695C', '#00796B', '#00897B', '#009688'
    ];
    const hash = this.getCompanyName().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  }

  getPartnerType(): string {
    const typeId: any = this.partner?.partnerTypeId || this.partner?.partner?.partnerTypeId;
    
    const types: Record<string | number, string> = {
      1: 'Юридическое лицо',
      2: 'Индивидуальный предприниматель',
      3: 'Физическое лицо',
      4: 'Некоммерческая организация',
      5: 'Общественная организация',
      6: 'Благотворительный фонд',
      7: 'Ассоциация',
      8: 'Союз',
      9: 'Автономная некоммерческая организация',
      10: 'Товарищество собственников',
      11: 'Общественная организация',
      12: 'Религиозная организация',
      13: 'Фонд',
      14: 'Учреждение',
      15: 'Государственная корпорация',
      16: 'Муниципальное образование'
    };
    
    return types[typeId] || types[Number(typeId)] || 'Компания';
  }

  getPartnerTypeBadge(): { text: string; color: string } {
    const type = this.getPartnerType();
    
    if (type.includes('Юридическое')) {
      return { text: 'ЮЛ', color: '#3b82f6' };
    } else if (type.includes('Индивидуальный')) {
      return { text: 'ИП', color: '#8b5cf6' };
    } else if (type.includes('Физическое')) {
      return { text: 'ФЛ', color: '#ec4899' };
    } else if (type.includes('Некоммерческая')) {
      return { text: 'НКО', color: '#f59e0b' };
    } else {
      return { text: 'Компания', color: '#64748b' };
    }
  }

  // Реквизиты
  getINN(): string {
    return this.partner?.inn || this.partner?.partner?.inn || '—';
  }

  getOGRN(): string {
    return this.partner?.ogrn || this.partner?.partner?.ogrn || '—';
  }

  getKPP(): string {
    return this.partner?.kpp || this.partner?.partner?.kpp || '';
  }

  hasKPP(): boolean {
    return !!this.getKPP();
  }

  getWorkDirection(): string {
    return this.partner?.workDirection || 'Не указана';
  }

  // Контакты
  getContactPerson(): { fullName: string; initials: string; role: string } {
    // Сначала проверяем userInstances
    if (this.partner?.userInstances && this.partner.userInstances.length > 0) {
      const user = this.partner.userInstances[0];
      const fullName = [user.lastName, user.firstName, user.middleName]
        .filter(Boolean)
        .join(' ');
      
      return {
        fullName: fullName || 'Контакт не указан',
        initials: this.getInitialsFromName(fullName),
        role: 'Представитель компании'
      };
    }
    
    // Затем проверяем отдельные поля
    const fullName = [this.partner?.lastName, this.partner?.firstName, this.partner?.middleName]
      .filter(Boolean)
      .join(' ');
    
    return {
      fullName: fullName || 'Контакт не указан',
      initials: this.getInitialsFromName(fullName),
      role: 'Представитель компании'
    };
  }

  private getInitialsFromName(name: string): string {
    if (!name || name === 'Контакт не указан') return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  getPhone(): string {
    return this.partner?.phoneNumber || '';
  }

  hasPhone(): boolean {
    return !!this.getPhone();
  }

  getEmail(): string {
    return this.partner?.email || '';
  }

  hasEmail(): boolean {
    return !!this.getEmail();
  }

  getWebsite(): string {
    return this.partner?.website || '';
  }

  hasWebsite(): boolean {
    return !!this.getWebsite();
  }

  // Адрес
  getAddress(): {
    full: string;
    short: string;
    parts: Record<string, string>;
  } {
    const addr = this.partner?.address;
    if (!addr) {
      return {
        full: 'Адрес не указан',
        short: 'Адрес не указан',
        parts: {}
      };
    }

    const parts = {
      country: addr.country || '',
      region: addr.region || '',
      city: addr.city || '',
      street: addr.street || '',
      house: addr.house || '',
      building: addr.building || '',
      apartment: addr.apartment || '',
      postIndex: addr.postIndex || ''
    };

    const fullParts = [];
    if (parts.postIndex) fullParts.push(parts.postIndex);
    if (parts.country) fullParts.push(parts.country);
    if (parts.region && parts.region !== parts.city) fullParts.push(parts.region);
    if (parts.city) fullParts.push(`г. ${parts.city}`);
    if (parts.street) fullParts.push(`ул. ${parts.street}`);
    if (parts.house) fullParts.push(`д. ${parts.house}`);
    if (parts.building) fullParts.push(`корп. ${parts.building}`);
    if (parts.apartment) fullParts.push(`кв. ${parts.apartment}`);

    const shortParts = [];
    if (parts.city) shortParts.push(parts.city);
    if (parts.street) shortParts.push(`ул. ${parts.street}`);
    if (parts.house) shortParts.push(parts.house);

    return {
      full: fullParts.join(', ') || 'Адрес не указан',
      short: shortParts.join(', ') || 'Адрес не указан',
      parts
    };
  }

  hasAddress(): boolean {
    const addr = this.partner?.address;
    if (!addr) return false;
    return Object.values(addr).some(val => val && val.trim());
  }

  // Банковские реквизиты
  getBankDetails(): {
    name: string;
    bik: string;
    account: string;
    korAccount: string;
    fullName: string;
  } {
    return {
      name: this.partner?.bank?.partner?.shortName || 'Не указан',
      fullName: this.partner?.bank?.partner?.fullName || '',
      bik: this.partner?.bank?.bik || '—',
      account: this.partner?.checkingAccount || '—',
      korAccount: this.partner?.korAccount || '—'
    };
  }

  hasBankDetails(): boolean {
    const bank = this.getBankDetails();
    return !!(bank.name !== 'Не указан' || bank.bik !== '—' || bank.account !== '—');
  }

  // Даты
  getCreatedDate(): string {
    if (!this.partner?.createdAt) return '—';
    return new Date(this.partner.createdAt).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  getUpdatedDate(): string {
    if (!this.partner?.updatedAt) return '—';
    return new Date(this.partner.updatedAt).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Форматирование
  formatPhone(phone: string): string {
    if (!phone) return '—';
    
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
    } else if (cleaned.length === 10) {
      return `+7 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8)}`;
    }
    return phone;
  }

  formatINN(inn: string): string {
    if (!inn || inn === '—') return inn;
    if (inn.length === 10) {
      return `${inn.substring(0, 2)} ${inn.substring(2, 5)} ${inn.substring(5, 8)} ${inn.substring(8)}`;
    } else if (inn.length === 12) {
      return `${inn.substring(0, 4)} ${inn.substring(4, 8)} ${inn.substring(8)}`;
    }
    return inn;
  }

  formatOGRN(ogrn: string): string {
    if (!ogrn || ogrn === '—') return ogrn;
    if (ogrn.length === 13) {
      return `${ogrn.substring(0, 3)} ${ogrn.substring(3, 7)} ${ogrn.substring(7, 11)} ${ogrn.substring(11)}`;
    }
    return ogrn;
  }

  formatAccount(account: string): string {
    if (!account || account === '—') return account;
    // Форматируем по группам: 5-3-5-2-5
    if (account.length === 20) {
      return `${account.substring(0, 5)} ${account.substring(5, 8)} ${account.substring(8, 13)} ${account.substring(13, 15)} ${account.substring(15)}`;
    }
    return account;
  }

  // Действия
  copyToClipboard(text: string, message: string = 'Скопировано в буфер обмена'): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showCopyNotification = true;
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => {
        this.showCopyNotification = false;
      }, 2000);
    }).catch(err => {
      console.error('Ошибка копирования:', err);
    });
  }

  copyAllRequisites(): void {
    const text = this.getAllRequisitesText();
    this.copyToClipboard(text, 'Все реквизиты скопированы');
  }

  getAllRequisitesText(): string {
    const lines = [
      this.getCompanyName(),
      this.getCompanyShortName(),
      '='.repeat(30),
      `ИНН: ${this.getINN()}`,
      `ОГРН: ${this.getOGRN()}`,
    ];

    if (this.hasKPP()) {
      lines.push(`КПП: ${this.getKPP()}`);
    }

    lines.push('');
    lines.push('КОНТАКТЫ:');
    const contact = this.getContactPerson();
    lines.push(`Контактное лицо: ${contact.fullName}`);
    if (this.hasPhone()) lines.push(`Телефон: ${this.formatPhone(this.getPhone())}`);
    if (this.hasEmail()) lines.push(`Email: ${this.getEmail()}`);

    if (this.hasAddress()) {
      lines.push('');
      lines.push('АДРЕС:');
      lines.push(this.getAddress().full);
    }

    if (this.hasBankDetails()) {
      const bank = this.getBankDetails();
      lines.push('');
      lines.push('БАНКОВСКИЕ РЕКВИЗИТЫ:');
      if (bank.name !== 'Не указан') lines.push(`Банк: ${bank.name}`);
      if (bank.bik !== '—') lines.push(`БИК: ${bank.bik}`);
      if (bank.account !== '—') lines.push(`Расчетный счет: ${bank.account}`);
      if (bank.korAccount !== '—') lines.push(`Корр. счет: ${bank.korAccount}`);
    }

    return lines.join('\n');
  }

  downloadRequisites(): void {
    const text = this.getAllRequisitesText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `${this.getCompanyShortName().replace(/\s+/g, '_')}_реквизиты.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Навигация
  setActiveTab(tab: 'overview' | 'details' | 'bank' | 'documents'): void {
    this.activeTab = tab;
  }

  editPartner(): void {
    this.edit.emit(this.partner);
  }

  createNewContract(): void {
    this.createContract.emit(this.partner);
  }

  sendDocumentsToPartner(): void {
    this.sendDocuments.emit(this.partner);
  }

  closeModal(): void {
    this.isClosing = true;
    setTimeout(() => {
      this.close.emit();
    }, 200);
  }

  // Вспомогательные методы
  trackByIndex(index: number): number {
    return index;
  }

  onBlockHover(block: string | null): void {
    this.hoveredBlock = block;
  }
}