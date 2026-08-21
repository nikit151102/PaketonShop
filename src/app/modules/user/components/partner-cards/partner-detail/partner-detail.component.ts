import { Component, EventEmitter, Input, Output, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { AuthRoutingModule } from "../../../../auth/auth-routing.module";
import { HttpClient } from '@angular/common/http';
import { PartnerService } from '../../../../../core/api/partner.service';
import { CreateWholesaleOrderDto, WholesaleOrderService } from '../../../../../core/api/wholesale-order.service';
import { switchMap, of, catchError, finalize, Observable, throwError, map, tap } from 'rxjs';
import { UserService } from '../../../../../core/services/user.service';

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
  registerDateTime?: string;
  wholesaleOrders?: Array<{
    id: string;
    wholesaleOrderStatus: number;
    orderDocuments?: Array<{
      id: string;
      orderDocumentType: number;
      fileInfo: {
        id: string;
        fileName: string;
        size: number;
        extansion: string;
        url: string;
        isDeleted: boolean;
      };
      isDeleted: boolean;
    }>;
  }>;
  partner?: {
    id: string;
    shortName: string;
    fullName: string;
    inn: string;
    ogrn: string;
    kpp?: string;
    partnerTypeId?: string | number;
    registerDateTime?: string;
    partnerType?: {
      id: string;
      code: number;
      fullName: string;
      shortName: string;
    };
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
    id: string;
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
        style({ opacity: 0, transform: 'scale(0.98) translateY(10px)' }),
        animate('250ms ease-out', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.98) translateY(10px)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('150ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('pulse', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
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
  copyTimer: any;
  hoveredBlock: string | null = null;

  documentTypes: any[] = [
    { id: 1, name: 'Решение о создании ООО', requiredFor: [1], optionalFor: [], hint: 'Документ о регистрации юридического лица' },
    { id: 2, name: 'Устав', requiredFor: [1], optionalFor: [], hint: 'Учредительный документ (листы 1, 2, последний, полномочия директора)' },
    { id: 3, name: 'Решение о назначении директора', requiredFor: [1], optionalFor: [], hint: 'Документ, подтверждающий полномочия руководителя' },
    { id: 5, name: 'Карточка предприятия', requiredFor: [1, 16], optionalFor: [], hint: 'Реквизиты компании для договоров и счетов' },
    { id: 6, name: 'Свидетельство ОГРН', requiredFor: [], optionalFor: [1], condition: 'before2017', hint: 'Для компаний, зарегистрированных до 2017 года' },
    { id: 7, name: 'Свидетельство ИНН/КПП', requiredFor: [], optionalFor: [1], condition: 'before2017', hint: 'Для компаний, зарегистрированных до 2017 года' },
    { id: 8, name: 'Свидетельство ОГРНИП', requiredFor: [], optionalFor: [16], condition: 'before2017', hint: 'Для ИП, зарегистрированных до 2017 года' },
    { id: 9, name: 'Паспорт', requiredFor: [1, 16], optionalFor: [], hint: 'Разворот с фото и пропиской представителя компании' },
    {
      id: 99,
      name: 'Договор',
      requiredFor: [1, 16],
      optionalFor: [],
      viewOnly: true,
      alwaysShow: true,
      hint: 'Договор формируется автоматически после подачи заявки. Доступен только для просмотра.'
    },
    {
      id: 97,
      name: 'Приложение к договору',
      requiredFor: [1, 16],
      optionalFor: [],
      viewOnly: true,
      alwaysShow: true,
      hint: 'Приложение к договору формируется автоматически. Доступно только для просмотра.'
    },
    {
      id: 100,
      name: 'Договор (подписанный)',
      requiredFor: [1, 16],
      optionalFor: [],
      clientUpload: true,
      alwaysShow: true,
      hint: 'Загрузите скан подписанного со своей стороны договора для завершения регистрации.'
    }
  ];

  pendingDocumentChanges = new Set<number>();
  isSavingDocuments = false;
  saveSuccess = false;
  isSubmittingApplication = false;
  applicationSubmitted = false;
  currentUserData: any;

  showContractModal = false;
  isCreatingContract = false;
  contractCreated = false;

  private pendingFiles = new Map<number, File>();

  constructor(
    private http: HttpClient,
    private wholesaleOrderService: WholesaleOrderService,
    private partnerService: PartnerService,
    private userService: UserService,
    private cdr: ChangeDetectorRef,
  ) { }

  ngOnInit() {
    document.body.style.overflow = 'hidden';
    this.userService.user$.subscribe((user: any) => { this.currentUserData = user; });
  }

  ngOnDestroy() {
    document.body.style.overflow = '';
    if (this.copyTimer) clearTimeout(this.copyTimer);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.closeModal();
  }

  getCompanyName(): string {
    return this.partner?.fullName || this.partner?.partner?.fullName || 'Без названия';
  }

  getCompanyShortName(): string {
    return this.partner?.shortName || this.partner?.partner?.shortName || this.getCompanyInitials();
  }

  getCompanyInitials(): string {
    const name = this.getCompanyName();
    const words = name.split(' ');
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase() || '??';
  }

  getCompanyLogoColor(): string {
    const colors = ['#3c8a27', '#2d6a1f', '#4CAF50', '#388E3C', '#2E7D32', '#1B5E20', '#00695C', '#00796B', '#00897B', '#009688'];
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
    if (type.includes('Юридическое')) return { text: 'ЮЛ', color: '#3b82f6' };
    if (type.includes('Индивидуальный')) return { text: 'ИП', color: '#8b5cf6' };
    if (type.includes('Физическое')) return { text: 'ФЛ', color: '#ec4899' };
    if (type.includes('Некоммерческая')) return { text: 'НКО', color: '#f59e0b' };
    return { text: 'Компания', color: '#64748b' };
  }

  getPartnerTypeCode(): number {
    if (this.partner?.partner?.partnerType?.code) return this.partner.partner.partnerType.code;
    const typeId = this.partner?.partnerTypeId || this.partner?.partner?.partnerTypeId;
    return Number(typeId) || 0;
  }

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

  getContactPerson(): { fullName: string; initials: string; role: string } {
    if (this.partner?.userInstances?.length) {
      const user = this.partner.userInstances[0];
      const fullName = [user.lastName, user.firstName, user.middleName].filter(Boolean).join(' ');
      return {
        fullName: fullName || 'Контакт не указан',
        initials: this.getInitialsFromName(fullName),
        role: 'Представитель компании'
      };
    }
    const fullName = [this.partner?.lastName, this.partner?.firstName, this.partner?.middleName].filter(Boolean).join(' ');
    return {
      fullName: fullName || 'Контакт не указан',
      initials: this.getInitialsFromName(fullName),
      role: 'Представитель компании'
    };
  }

  private getInitialsFromName(name: string): string {
    if (!name || name === 'Контакт не указан') return '??';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
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

  getAddress(): { full: string; short: string; parts: Record<string, string> } {
    const addr = this.partner?.address;
    if (!addr) return { full: 'Адрес не указан', short: 'Адрес не указан', parts: {} };

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

  getBankDetails(): { name: string; bik: string; account: string; korAccount: string; fullName: string } {
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

  getCreatedDate(): string {
    if (!this.partner?.createdAt) return '—';
    return new Date(this.partner.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  getUpdatedDate(): string {
    if (!this.partner?.updatedAt) return '—';
    return new Date(this.partner.updatedAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatPhone(phone: string): string {
    if (!phone) return '—';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
    if (cleaned.length === 10) return `+7 (${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6, 8)}-${cleaned.substring(8)}`;
    return phone;
  }

  formatINN(inn: string): string {
    if (!inn || inn === '—') return inn;
    if (inn.length === 10) return `${inn.substring(0, 2)} ${inn.substring(2, 5)} ${inn.substring(5, 8)} ${inn.substring(8)}`;
    if (inn.length === 12) return `${inn.substring(0, 4)} ${inn.substring(4, 8)} ${inn.substring(8)}`;
    return inn;
  }

  formatOGRN(ogrn: string): string {
    if (!ogrn || ogrn === '—') return ogrn;
    if (ogrn.length === 13) return `${ogrn.substring(0, 3)} ${ogrn.substring(3, 7)} ${ogrn.substring(7, 11)} ${ogrn.substring(11)}`;
    return ogrn;
  }

  formatAccount(account: string): string {
    if (!account || account === '—') return account;
    if (account.length === 20) return `${account.substring(0, 5)} ${account.substring(5, 8)} ${account.substring(8, 13)} ${account.substring(13, 15)} ${account.substring(15)}`;
    return account;
  }

  formatFileSize(bytes: number): string {
    if (!bytes) return '—';
    if (bytes < 1024) return bytes + ' Б';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' КБ';
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  }

  getActiveWholesaleOrder(): any {
    const orders = this.partner?.wholesaleOrders;
    if (!orders || orders.length === 0) return null;

    return orders.find((order: any) => {
      const status = Number(order.wholesaleOrderStatus);
      return status !== 10 && status !== 11;
    }) || null;
  }

  getContractStatus(): 'not_started' | 'draft' | 'pending' | 'signed' | 'rejected' | 'inactive' {
    const order = this.getActiveWholesaleOrder();
    if (!order) return 'not_started';

    const status = Number(order.wholesaleOrderStatus);

    switch (status) {
      case 0:
      case 1:
        return 'pending';
      case 2:
      case 3:
        return 'pending';
      case 4:
        return 'signed';
      case 10:
        return 'rejected';
      case 11:
        return 'inactive';
      default:
        return 'not_started';
    }
  }

  getContractStatusBadge(): { text: string; color: string; icon: string } {
    const status = this.getContractStatus();
    switch (status) {
      case 'not_started':
        return { text: 'Заявка не подана', color: '#64748b', icon: '○' };
      case 'draft':
        return { text: 'Черновик', color: '#f59e0b', icon: '◐' };
      case 'pending':
        return { text: 'На проверке', color: '#3b82f6', icon: '◑' };
      case 'signed':
        return { text: 'Подписан', color: '#10b981', icon: '✓' };
      case 'rejected':
        return { text: 'Отклонён', color: '#ef4444', icon: '✕' };
      case 'inactive':
        return { text: 'Неактивен', color: '#94a3b8', icon: '⊘' };
      default:
        return { text: 'Неизвестно', color: '#64748b', icon: '?' };
    }
  }

  getOrderDocuments(): Array<{ id: string; type: number; fileName: string; fileSize: number; fileUrl: string; extension: string }> {
    const docs: any[] = [];
    const order = this.getActiveWholesaleOrder();
    if (order?.orderDocuments) {
      order.orderDocuments.forEach((doc: any) => {
        if (doc?.fileInfo) {
          docs.push({
            id: doc.id,
            type: doc.orderDocumentType,
            fileName: doc.fileInfo.fileName,
            fileSize: doc.fileInfo.size,
            fileUrl: doc.fileInfo.url,
            extension: doc.fileInfo.extansion
          });
        }
      });
    }
    return docs;
  }

  getDocumentByType(typeId: number): any {
    return this.getOrderDocuments().find(doc => doc.type === typeId);
  }

  isDocumentUploaded(typeId: number): boolean {
    return !!this.getDocumentByType(typeId);
  }

  getRequiredDocuments(): any[] {
    const code = this.getPartnerTypeCode();
    if (!code) return [];

    if (code === 1 || code === 16) {
      return this.documentTypes.filter(doc => {
        const isRequired = doc.requiredFor?.includes(code);
        const isOptional = doc.optionalFor?.includes(code);
        return isRequired && !isOptional;
      });
    }

    return this.documentTypes.filter(doc => doc.viewOnly || doc.alwaysShow);
  }

  getOptionalDocuments(): any[] {
    const code = this.getPartnerTypeCode();
    if (!code) return [];

    if (code === 1 || code === 16) {
      return this.documentTypes.filter(doc => {
        const isOptional = doc.optionalFor?.includes(code);
        const isRequired = doc.requiredFor?.includes(code);
        return isOptional && !isRequired;
      });
    }

    return this.documentTypes.filter(doc => !doc.viewOnly || doc.alwaysShow);
  }

  getDocumentIcon(extension: string): string {
    const ext = extension?.toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    return '📎';
  }

  getDocumentStatus(typeId: number): 'uploaded' | 'pending' | 'missing' {
    const doc = this.documentTypes.find(d => d.id === typeId);

    if (doc?.viewOnly) {
      return this.isDocumentUploaded(typeId) ? 'uploaded' : 'missing';
    }

    if (typeId === 100 && this.getContractStatus() === 'not_started') {
      return 'missing';
    }

    if (this.pendingDocumentChanges.has(typeId)) return 'pending';
    if (this.isDocumentUploaded(typeId)) return 'uploaded';
    return 'missing';
  }

  get hasPendingChanges(): boolean {
    return this.pendingDocumentChanges.size > 0;
  }

  getMissingRequiredDocumentsCount(): number {
    return this.getRequiredDocuments().filter((doc: any) => !this.isDocumentUploaded(doc.id)).length;
  }

  hasMissingRequiredDocuments(): boolean {
    return this.getMissingRequiredDocumentsCount() > 0;
  }

  submitApplication(): void {
    if (!this.partner?.id || !this.currentUserData?.id) return;

    this.isSubmittingApplication = true;

    const orderDto: CreateWholesaleOrderDto = {
      partnerInstanceId: this.partner.id,
      userInstanceId: this.currentUserData.id,
      wholesalePartnerType: 1,
      beginDateTime: null,
      endDateTime: null,
      productPlaceCode: null,
    };

    this.wholesaleOrderService.createOrder(orderDto).pipe(
      catchError((error) => {
        return throwError(() => new Error('Не удалось подать заявку'));
      }),
      finalize(() => {
        this.isSubmittingApplication = false;
      })
    ).subscribe({
      next: (response) => {
        this.applicationSubmitted = true;
      },
      error: (err) => {
      }
    });
  }

  saveDocuments(): void {
    if (!this.hasPendingChanges || !this.partner?.id) return;

    this.isSavingDocuments = true;

    const existingOrder = this.getActiveWholesaleOrder();

    const orderObservable = existingOrder
      ? of(existingOrder.id)
      : this.createWholesaleOrder();

    orderObservable.pipe(
      switchMap((orderId: string) => {
        const files: File[] = [];
        const documentTypes: number[] = [];

        this.pendingDocumentChanges.forEach((docTypeId: number) => {
          const file = this.pendingFiles.get(docTypeId);
          if (file) {
            files.push(file);
            documentTypes.push(docTypeId);
          }
        });

        if (files.length > 0) {
          return this.wholesaleOrderService.addDocuments(orderId, files, documentTypes);
        }

        return of(orderId);
      }),
      catchError((error) => {
        return of(null);
      }),
      finalize(() => {
        this.isSavingDocuments = false;
      })
    ).subscribe({
      next: (result) => {
        if (result) {
          this.pendingDocumentChanges.clear();
          this.pendingFiles.clear();
          this.saveSuccess = true;

          setTimeout(() => {
            this.saveSuccess = false;
          }, 3000);
        }
      },
      error: (err) => {
      }
    });
  }

  private createWholesaleOrder(): Observable<string> {
    const userId = this.currentUserData?.data?.id || this.currentUserData?.id;
    if (!userId) {
      return throwError(() => new Error('Не найден ID пользователя'));
    }

    const orderDto: CreateWholesaleOrderDto = {
      partnerInstanceId: this.partner!.id,
      userInstanceId: userId,
      wholesalePartnerType: 1,
      beginDateTime: null,
      endDateTime: null,
      productPlaceCode: null,
    };

    return this.wholesaleOrderService.createOrder(orderDto).pipe(
      tap(response => {
        if (this.partner) {
          if (!this.partner.wholesaleOrders) {
            this.partner.wholesaleOrders = [];
          }
          this.partner.wholesaleOrders = [
            ...this.partner.wholesaleOrders,
            {
              id: response.data.id,
              wholesaleOrderStatus: 1
            }
          ];
        }
      }),
      map((response) => response.data.id)
    );
  }

  openDocument(url: string): void {
    window.open(url, '_blank');
  }

  downloadDocument(url: string, fileName: string): void {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  copyToClipboard(text: string, message: string = 'Скопировано'): void {
    navigator.clipboard.writeText(text).then(() => {
      this.showCopyNotification = true;
      if (this.copyTimer) clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => {
        this.showCopyNotification = false;
      }, 2000);
    }).catch(() => { });
  }

  copyAllRequisites(): void {
    const text = this.getAllRequisitesText();
    this.copyToClipboard(text, 'Все реквизиты скопированы');
  }

  getAllRequisitesText(): string {
    const lines = [this.getCompanyName(), this.getCompanyShortName(), '='.repeat(30), `ИНН: ${this.getINN()}`, `ОГРН: ${this.getOGRN()}`];

    if (this.hasKPP()) lines.push(`КПП: ${this.getKPP()}`);

    lines.push('', 'КОНТАКТЫ:');
    const contact = this.getContactPerson();
    lines.push(`Контактное лицо: ${contact.fullName}`);

    if (this.hasPhone()) lines.push(`Телефон: ${this.formatPhone(this.getPhone())}`);
    if (this.hasEmail()) lines.push(`Email: ${this.getEmail()}`);

    if (this.hasAddress()) {
      lines.push('', 'АДРЕС:');
      lines.push(this.getAddress().full);
    }

    if (this.hasBankDetails()) {
      const bank = this.getBankDetails();
      lines.push('', 'БАНКОВСКИЕ РЕКВИЗИТЫ:');
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

  trackByIndex(index: number): number {
    return index;
  }

  onBlockHover(block: string | null): void {
    this.hoveredBlock = block;
  }

  showCreateContractModal(): void {
    this.showContractModal = true;
    this.contractCreated = false;
  }

  closeContractModal(): void {
    this.showContractModal = false;
    this.isCreatingContract = false;
  }

  onFileSelected(event: Event, documentTypeId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (!allowedTypes.includes(file.type)) {
      alert('Разрешены только файлы PDF, JPEG, PNG и Word');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Файл слишком большой. Максимальный размер 10 МБ');
      return;
    }

    this.pendingFiles.set(documentTypeId, file);
    this.pendingDocumentChanges.add(documentTypeId);
    this.saveSuccess = false;

    input.value = '';
  }

  removeDocument(documentTypeId: number): void {
    this.pendingFiles.delete(documentTypeId);
    this.pendingDocumentChanges.add(documentTypeId);
    this.saveSuccess = false;
  }

  private getFileForDocumentType(typeId: number): File | null {
    return this.pendingFiles.get(typeId) || null;
  }

  submitApplicationWithDocuments(): void {
    if (!this.partner?.id) {
      alert('Ошибка: не найден ID партнёра');
      return;
    }

    const userId = this.currentUserData?.data?.id || this.currentUserData?.id;
    if (!userId) {
      alert('Ошибка: не найден ID пользователя. Пожалуйста, войдите в систему.');
      return;
    }

    this.isSubmittingApplication = true;

    const orderDto: CreateWholesaleOrderDto = {
      partnerInstanceId: this.partner.id,
      userInstanceId: userId,
      wholesalePartnerType: 1,
      beginDateTime: null,
      endDateTime: null,
      productPlaceCode: null,
    };

    this.wholesaleOrderService.createOrder(orderDto).pipe(
      switchMap((orderResponse) => {
        const orderId = orderResponse?.data?.id;

        if (!orderId) {
          throw new Error('Не получен ID заказа от сервера');
        }

        const files: File[] = [];
        const documentTypes: number[] = [];

        this.pendingDocumentChanges.forEach((docTypeId: number) => {
          const file = this.pendingFiles.get(docTypeId);
          if (file) {
            files.push(file);
            documentTypes.push(docTypeId);
          }
        });

        if (files.length > 0) {
          return this.wholesaleOrderService.addDocuments(orderId, files, documentTypes).pipe(
            map(() => ({ success: true, orderId }))
          );
        }

        return of({ success: true, orderId });
      }),
      catchError((error) => {
        const message = error?.message || error?.error?.message || 'Не удалось создать заявку';
        alert(message);
        return of({ success: false });
      }),
      finalize(() => {
        this.isSubmittingApplication = false;
        this.cdr.detectChanges();
      })
    ).subscribe({
      next: (result) => {
        if (result?.success) {
          this.pendingDocumentChanges.clear();
          this.pendingFiles.clear();
          this.applicationSubmitted = true;
          this.contractCreated = true;

          this.cdr.detectChanges();

          setTimeout(() => {
            this.activeTab = 'documents';
            this.closeContractModal();
            this.cdr.detectChanges();
          }, 800);
        } else {
          alert('Не удалось создать заявку. Пожалуйста, попробуйте ещё раз.');
        }
      },
      error: (err) => {
        alert('Произошла ошибка. Пожалуйста, попробуйте ещё раз.');
        this.cdr.detectChanges();
      },
      complete: () => {
      }
    });
  }

  confirmCreateContract(): void {
    if (!this.partner?.id || !this.currentUserData?.id) return;

    this.isCreatingContract = true;

    const orderDto: CreateWholesaleOrderDto = {
      partnerInstanceId: this.partner.id,
      userInstanceId: this.currentUserData.id,
      wholesalePartnerType: 1,
      beginDateTime: null,
      endDateTime: null,
      productPlaceCode: null,
    };

    this.wholesaleOrderService.createOrder(orderDto).pipe(
      catchError((error) => {
        return throwError(() => new Error('Не удалось создать договор'));
      }),
      finalize(() => {
        this.isCreatingContract = false;
      })
    ).subscribe({
      next: (response) => {
        this.contractCreated = true;

        setTimeout(() => {
          this.activeTab = 'documents';
          this.closeContractModal();
        }, 1500);
      },
      error: (err) => {
      }
    });
  }

  canUploadDocuments(): boolean {
    const status = this.getContractStatus();
    return status === 'draft' || status === 'pending' || status === 'signed' || this.contractCreated;
  }

  proceedToDocumentsTab(): void {
    this.closeContractModal();
    this.setActiveTab('documents');
  }
}