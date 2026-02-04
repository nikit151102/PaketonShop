import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { PartnerDetailComponent } from './partner-detail/partner-detail.component';
import { PartnerFormComponent } from './partner-form/partner-form.component';
import { Subject, takeUntil, finalize } from 'rxjs';
import { PartnerService } from '../../../../core/api/partner.service';


interface Partner {
  id: string;
  fullName: string;
  shortName: string;
  inn: string;
  ogrn: string;
  kpp?: string;
  address?: Address;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  korAccount?: string;
  checkingAccount?: string;
  workDirection?: string;
  phoneNumber?: string;
  partnerTypeId?: number | string;
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
    partnerTypeId?: string | number;
  };
}

interface Address {
  id?: string;
  country?: string;
  region?: string;
  city?: string;
  street?: string;
  house?: string;
  apartment?: string;
  postIndex?: string;
  label?: string;
}

interface Notification {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Component({
  selector: 'app-partner-cards',
  standalone: true,
  imports: [
    CommonModule,
    PartnerDetailComponent,
    PartnerFormComponent,
  ],
  templateUrl: './partner-cards.component.html',
  styleUrls: ['./partner-cards.component.scss']
})
export class PartnerCardsComponent implements OnInit, OnDestroy {
  @ViewChild('cardsContainer') cardsContainer!: ElementRef;

  companies: Partner[] = [];
  activePartner: Partner | null = null;
  loading = true;
  error: string | null = null;
  notification: Notification | null = null;

  // Состояния формы
  showPartnerForm = false;
  editingPartner: Partner | null = null;

  // Для скролла
  currentSlide = 0;
  private scrollTimeout: any;

  private destroy$ = new Subject<void>();

  constructor(private partnerService: PartnerService) { }

  ngOnInit(): void {
    this.loadPartners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }


  // Вспомогательные методы для безопасного доступа к данным
  // Исправленные методы для безопасного доступа
  getCompanyShortName(company: Partner): string {
    if (!company) return 'Без названия';

    // Сначала проверяем прямые свойства компании
    if (company.shortName) return company.shortName;

    // Затем проверяем partner с безопасным доступом
    if (company.partner && typeof company.partner === 'object') {
      if (company.partner.shortName) return company.partner.shortName;
    }

    return 'Без названия';
  }

  getCompanyFullName(company: Partner): string {
    if (!company) return 'Нет полного названия';

    if (company.fullName) return company.fullName;

    if (company.partner && typeof company.partner === 'object') {
      if (company.partner.fullName) return company.partner.fullName;
    }

    return 'Нет полного названия';
  }

  getCompanyINN(company: Partner): string {
    if (!company) return 'Не указан';

    if (company.inn) return company.inn;

    if (company.partner && typeof company.partner === 'object') {
      if (company.partner.inn) return company.partner.inn;
    }

    return 'Не указан';
  }

  getCompanyOGRN(company: Partner): string {
    if (!company) return 'Не указан';

    if (company.ogrn) return company.ogrn;

    if (company.partner && typeof company.partner === 'object') {
      if (company.partner.ogrn) return company.partner.ogrn;
    }

    return 'Не указан';
  }

  // Исправленные методы определения типа
  isLegalEntity(company: Partner): boolean {
    if (!company) return false;

    const partnerTypeId = company.partnerTypeId ||
      (company.partner && typeof company.partner === 'object' ? company.partner.partnerTypeId : null);

    return partnerTypeId === 1 || partnerTypeId === '1';
  }

  isIndividualEntity(company: Partner): boolean {
    if (!company) return false;

    const partnerTypeId = company.partnerTypeId ||
      (company.partner && typeof company.partner === 'object' ? company.partner.partnerTypeId : null);

    return partnerTypeId === 2 || partnerTypeId === '2';
  }

  getCompanyLogoText(company: Partner): string {
    if (!company) return '??';

    const shortName = this.getCompanyShortName(company);
    if (shortName && shortName.length >= 2) {
      return shortName.substring(0, 2).toUpperCase();
    }
    return shortName ? shortName.toUpperCase() : '??';
  }

  // Также добавьте проверку в loadPartners для очистки данных
  loadPartners(): void {
    this.loading = true;
    this.error = null;

    this.partnerService.getPartnersUser()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.loading = false)
      )
      .subscribe({
        next: (response) => {
          if (response.data && Array.isArray(response.data)) {
            // Очищаем данные от null/undefined
            this.companies = response.data.filter((company: any) => company != null);
          } else {
            this.error = response.message || 'Нет данных о компаниях';
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Ошибка при загрузке партнеров';
          console.error('Ошибка загрузки партнеров:', err);
        }
      });
  }

  // Добавьте этот метод для дополнительной безопасности
  getSafeCompanyName(company: Partner): string {
    return this.getCompanyShortName(company) || 'Неизвестная компания';
  }


  getCompanyPhone(company: Partner): string {
    return company.phoneNumber ? this.formatPhoneNumber(company.phoneNumber) : 'Не указан';
  }

  getCompanyWorkDirection(company: Partner): string {
    return company.workDirection || 'Не указана';
  }

  getPartnerTypeText(company: Partner): string {
    if (this.isLegalEntity(company)) {
      return 'Юридическое лицо';
    } else if (this.isIndividualEntity(company)) {
      return 'Физическое лицо';
    }
    return 'Тип не указан';
  }

  getPartnerTypeTooltip(company: Partner): string {
    const typeText = this.getPartnerTypeText(company);
    return `${typeText}. ${typeText.includes('Юридическое') ? 'Требуется КПП' : 'КПП не требуется'}`;
  }

  getUpdatedDate(company: Partner): string {
    if (company.updatedAt) {
      const date = new Date(company.updatedAt);
      return `Обновлено: ${date.toLocaleDateString('ru-RU')}`;
    } else if (company.createdAt) {
      const date = new Date(company.createdAt);
      return `Создано: ${date.toLocaleDateString('ru-RU')}`;
    }
    return 'Дата не указана';
  }

  detailPartner(company: Partner): void {
    this.partnerService.getPartnerUser(company.id)
      .subscribe({
        next: (response) => {
          this.activePartner = response.data;
          console.log('response.data', response.data);
        },
        error: (err) => {
          this.error = err.error?.message || 'Ошибка при загрузке деталей партнера';
          console.error('Ошибка загрузки деталей партнера:', err);
        }
      });
  }

  closePartnerDetail(): void {
    this.activePartner = null;
  }

  openAddPartnerForm(): void {
    this.editingPartner = null;
    this.showPartnerForm = true;
  }

  openEditPartnerForm(partner: Partner, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.editingPartner = partner;
    this.showPartnerForm = true;
  }

  closePartnerForm(): void {
    this.showPartnerForm = false;
    this.editingPartner = null;
  }

  handlePartnerSaved(savedPartner: Partner): void {
    // Обновляем список партнеров
    this.loadPartners();
    this.closePartnerForm();

    // Если редактировали текущего партнера, обновляем детали
    if (this.activePartner?.id === savedPartner.id) {
      this.activePartner = savedPartner;
    }
  }

  deletePartner(company: Partner, event: Event): void {
    event.stopPropagation();

    const companyName = this.getCompanyShortName(company);
    if (confirm(`Вы уверены, что хотите удалить компанию "${companyName}"? Это действие нельзя отменить.`)) {
      this.loading = true;

      this.partnerService.deletePartnersUser(company.id)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => this.loading = false)
        )
        .subscribe({
          next: (response) => {
            if (response.success) {
              // Удаляем из списка
              this.companies = this.companies.filter(c => c.id !== company.id);

              // Если удалили активного партнера, закрываем детали
              if (this.activePartner?.id === company.id) {
                this.activePartner = null;
              }
            } else {
              this.error = response.message || 'Не удалось удалить партнера';
            }
          },
          error: (err) => {
            this.error = err.error?.message || 'Ошибка при удалении партнера';
            console.error('Ошибка удаления партнера:', err);
          }
        });
    }
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

  getLegalEntitiesCount(): number {
    return this.companies.filter(c => this.isLegalEntity(c)).length;
  }

  getIndividualEntitiesCount(): number {
    return this.companies.filter(c => this.isIndividualEntity(c)).length;
  }

  retry(): void {
    this.loadPartners();
  }

  // Функции для скролла
  scrollLeft(): void {
    if (this.cardsContainer && this.currentSlide > 0) {
      const container = this.cardsContainer.nativeElement;
      const cardWidth = container.querySelector('.company-card-modern')?.offsetWidth || 320;
      const gap = 20;
      const scrollAmount = cardWidth + gap;

      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      this.currentSlide--;

    }
  }

  scrollRight(): void {
    if (this.cardsContainer && this.currentSlide < this.companies.length - 1) {
      const container = this.cardsContainer.nativeElement;
      const cardWidth = container.querySelector('.company-card-modern')?.offsetWidth || 320;
      const gap = 20;
      const scrollAmount = cardWidth + gap;

      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      this.currentSlide++;

    }
  }

  onScroll(): void {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      if (this.cardsContainer) {
        const container = this.cardsContainer.nativeElement;
        const cardWidth = container.querySelector('.company-card-modern')?.offsetWidth || 320;
        const gap = 20;
        const scrollPosition = container.scrollLeft;
        this.currentSlide = Math.round(scrollPosition / (cardWidth + gap));
      }
    }, 100);
  }

  // Обработка клавиатурных сокращений
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    // Ctrl/Cmd + N - новая компания
    if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
      event.preventDefault();
      this.openAddPartnerForm();
    }

    // Escape - закрыть детали
    if (event.key === 'Escape' && this.activePartner) {
      this.closePartnerDetail();
    }

    // Стрелки для скролла
    if (event.key === 'ArrowLeft' && !this.showPartnerForm) {
      this.scrollLeft();
    }
    if (event.key === 'ArrowRight' && !this.showPartnerForm) {
      this.scrollRight();
    }
  }
}