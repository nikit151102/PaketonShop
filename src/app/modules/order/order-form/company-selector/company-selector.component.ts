import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { PartnerService } from '../../../../core/api/partner.service';
import { PartnerBankService } from '../../../../core/api/partner-bank.service';
import { PartnerTypeService } from '../../../../core/api/partner-type.service';
import { UserService } from '../../../../core/services/user.service';

interface PartnerBank {
  id: string;
  code: string;
  bik: string;
  partner: {
    id: string;
    shortName: string;
    fullName: string;
    inn: string;
  };
}

interface PartnerType {
  id: string;
  code: number;
  fullName: string;
  shortName: string;
}

@Component({
  selector: 'app-company-selector',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './company-selector.component.html',
  styleUrls: ['./company-selector.component.scss']
})
export class CompanySelectorComponent implements OnInit, OnDestroy {
  @Input() selectedCompanyId: string | null = null;
  @Output() selectedCompanyChange = new EventEmitter<string | null>();
  @Output() companyAdded = new EventEmitter<void>();
  @Output() companyEdited = new EventEmitter<any>();
  @Output() companyDeleted = new EventEmitter<string>();

  private userService = inject(UserService);

  companies: any[] = [];
  loading = false;
  error: string | null = null;

  isSelectionMode = false;
  previewedCompany: any | null = null;
  hoveredCompanyId: string | null = null;

  // Состояния формы
  showForm = false;
  formMode: 'add' | 'edit' = 'add';
  editingCompany: any | null = null;

  // Форма
  partnerForm: FormGroup;
  formSubmitting = false;
  formError: string | null = null;
  currentStep = 1;
  selectedPartnerType: PartnerType | null = null;
  selectedBank: PartnerBank | null = null;

  // Данные для выпадающих списков
  partnerTypes: PartnerType[] = [];
  filteredPartnerTypes: PartnerType[] = [];
  banks: PartnerBank[] = [];
  filteredBanks: PartnerBank[] = [];

  // Поиск
  typeSearchQuery = '';
  typeDropdownOpen = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private partnerService: PartnerService,
    private bankService: PartnerBankService,
    private partnerTypeService: PartnerTypeService
  ) {
    this.partnerForm = this.createForm();
  }

  ngOnInit(): void {
    this.loadCompanies();
    this.loadPartnerTypes();
    this.loadBanks();
    this.subscribeToUserData();

    // Подписка на поиск банков
    this.partnerForm.get('bankSearch')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(search => this.searchBanks(search));

    // Подписка на изменение типа партнера
    this.partnerForm.get('partnerTypeId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => this.onPartnerTypeChange(value));

    // Подписка на изменение bankId
    this.partnerForm.get('bankId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(bankId => {
        this.selectedBank = bankId ? this.banks.find(b => b.id === bankId) || null : null;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Закрытие dropdown при клике вне
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select')) {
      this.typeDropdownOpen = false;
    }
  }

  // ==================== Загрузка данных ====================
  loadCompanies(): void {
    this.loading = true;
    this.error = null;

    this.partnerService.getPartnersUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.companies = response.data;
            if (this.selectedCompanyId) {
              const selected = this.companies.find(c => c.id === this.selectedCompanyId);
              if (selected) this.previewedCompany = selected;
            }
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Ошибка загрузки компаний';
          console.error(err);
          this.loading = false;
        }
      });
  }

  private loadPartnerTypes(): void {
    this.partnerTypeService.getData().subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.partnerTypes = response.data;
          this.filteredPartnerTypes = [...this.partnerTypes];
        }
      },
      error: (err) => console.error('Ошибка загрузки типов:', err)
    });
  }

  private loadBanks(): void {
    this.bankService.getBanks().subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.banks = response.data;
          this.filteredBanks = [...this.banks];
        }
      },
      error: (err) => console.error('Ошибка загрузки банков:', err)
    });
  }


  private subscribeToUserData(): void {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      // Проверяем, что форма открыта в режиме добавления и нет редактируемой компании
      if (user && this.formMode === 'add' && !this.editingCompany && this.showForm) {
        const patchData: any = {};

        // Заполняем только те поля, которые есть в user и они не пустые
        if (user.lastName) patchData.lastName = user.lastName;
        if (user.firstName) patchData.firstName = user.firstName;
        if (user.middleName) patchData.middleName = user.middleName;
        if (user.phoneNumber) patchData.phoneNumber = this.formatPhoneForForm(user.phoneNumber);
        if (user.email) patchData.email = user.email;

        // Применяем только если есть хотя бы одно поле для заполнения
        if (Object.keys(patchData).length > 0) {
          this.partnerForm.patchValue(patchData, { emitEvent: false });
        }
      }
    });
  }
  // ==================== Форма ====================
  private createForm(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(200)]],
      shortName: ['', [Validators.required, Validators.maxLength(50)]],
      partnerTypeId: ['', Validators.required],
      workDirection: [''],
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      phoneNumber: ['', [Validators.required, this.phoneValidator]],
      email: ['', [Validators.email]],
      inn: ['', [Validators.required, Validators.pattern(/^\d{10}$|^\d{12}$/)]],
      ogrn: ['', [Validators.required, Validators.pattern(/^\d{13}$|^\d{15}$/)]],
      kpp: ['', this.kppValidator],
      korAccount: [''],
      bankAccount: [''],
      bankId: ['', Validators.required],
      bankSearch: [''],
      address: this.fb.group({
        country: ['Россия', Validators.required],
        region: ['', Validators.required],
        city: ['', Validators.required],
        street: ['', Validators.required],
        house: ['', Validators.required]
      })
    });
  }

  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const cleanValue = value.replace(/\D/g, '');
    return (cleanValue.length >= 10 && cleanValue.length <= 15) ? null : { invalidPhone: true };
  }

  private kppValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    return /^\d{9}$/.test(value) ? null : { invalidKpp: true };
  }

  private formatPhoneForForm(phone: string): string {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
      return cleaned.substring(1);
    }
    return cleaned;
  }

  private onPartnerTypeChange(typeId: string): void {
    const type = this.partnerTypes.find(t => t.id === typeId);
    this.selectedPartnerType = type || null;
    this.updateKppValidation();
  }

  private updateKppValidation(): void {
    const kppControl = this.partnerForm.get('kpp');
    if (this.selectedPartnerType?.code === 1) {
      kppControl?.setValidators([Validators.required, this.kppValidator]);
    } else {
      kppControl?.setValidators(this.kppValidator);
    }
    kppControl?.updateValueAndValidity();
  }

  private searchBanks(search: string): void {
    if (!search) {
      this.filteredBanks = [...this.banks];
      return;
    }
    const searchLower = search.toLowerCase();
    this.filteredBanks = this.banks.filter(bank =>
      bank.partner.shortName.toLowerCase().includes(searchLower) ||
      bank.partner.fullName.toLowerCase().includes(searchLower) ||
      bank.bik.toLowerCase().includes(searchLower)
    );
  }

  onBankSelect(bank: PartnerBank): void {
    this.selectedBank = bank;
    this.partnerForm.patchValue({
      bankId: bank.id,
      bankSearch: bank.partner.shortName
    });
    this.filteredBanks = [];
  }

  clearBankSelection(): void {
    this.selectedBank = null;
    this.partnerForm.patchValue({ bankId: '', bankSearch: '' });
  }

  // ==================== Управление формой ====================
  openForm(mode: 'add' | 'edit', company?: any): void {
    this.formMode = mode;
    this.editingCompany = company || null;
    this.showForm = true;
    this.currentStep = 1;
    this.formError = null;
    this.selectedPartnerType = null;
    this.selectedBank = null;
    this.typeDropdownOpen = false;
    this.typeSearchQuery = '';

    // Сбрасываем форму
    this.partnerForm.reset();

    if (mode === 'edit' && company) {
      this.loadCompanyToForm(company);
    } else {
      // Для новой компании устанавливаем значения по умолчанию
      this.partnerForm.patchValue({
        address: { country: 'Россия' }
      });

      // ДОБАВИТЬ: Заполняем данными пользователя при открытии формы добавления
      this.fillWithUserDataIfAvailable();
    }
  }

  private fillWithUserDataIfAvailable(): void {
    const user = this.userService.getUser(); // или как у вас получают текущего пользователя
    if (user && this.formMode === 'add') {
      const patchData: any = {};

      // Используем скобочную нотацию
      if (user['lastName']) patchData.lastName = user['lastName'];
      if (user['firstName']) patchData.firstName = user['firstName'];
      if (user['middleName']) patchData.middleName = user['middleName'];
      if (user['phoneNumber']) patchData.phoneNumber = this.formatPhoneForForm(user['phoneNumber']);
      if (user['email']) patchData.email = user['email'];

      if (Object.keys(patchData).length > 0) {
        this.partnerForm.patchValue(patchData, { emitEvent: false });
      }
    }
  }

  closeForm(): void {
    console.log('closeForm called', {
      showForm: this.showForm,
      formMode: this.formMode,
      currentStep: this.currentStep
    });

    this.showForm = false;
    this.formMode = 'add';
    this.editingCompany = null;
    this.currentStep = 1;
    this.formError = null;
    this.typeDropdownOpen = false;
    this.typeSearchQuery = '';
    this.filteredBanks = [];
    this.formSubmitting = false; // Сбрасываем флаг сабмита

    // Сбрасываем touched состояние при закрытии
    this.resetFormTouched();

    console.log('closeForm finished, showForm:', this.showForm);
  }

  private resetFormTouched(): void {
    const resetTouched = (control: AbstractControl) => {
      control.markAsUntouched();
      if (control instanceof FormGroup) {
        Object.values(control.controls).forEach(c => resetTouched(c));
      }
    };
    resetTouched(this.partnerForm);
  }

  private loadCompanyToForm(company: any): void {
    this.partnerForm.patchValue({
      fullName: company.fullName || company.partner?.fullName || '',
      shortName: company.shortName || company.partner?.shortName || '',
      partnerTypeId: company.partnerTypeId || company.partner?.partnerTypeId || '',
      workDirection: company.workDirection || company.partner?.workDirection || '',
      lastName: company.lastName || company.partner?.lastName || '',
      firstName: company.firstName || company.partner?.firstName || '',
      middleName: company.middleName || company.partner?.middleName || '',
      phoneNumber: company.phoneNumber || company.partner?.phoneNumber || '',
      email: company.email || company.partner?.email || '',
      inn: company.inn || company.partner?.inn || '',
      ogrn: company.ogrn || company.partner?.ogrn || '',
      kpp: company.kpp || company.partner?.kpp || '',
      korAccount: company.korAccount || company.partner?.korAccount || '',
      bankAccount: company.bankAccount || company.partner?.bankAccount || '',
      bankId: company.bankId || company.partner?.bankId || '',
    });

    if (company.address || company.partner?.address) {
      const addr = company.address || company.partner?.address;
      this.partnerForm.patchValue({
        address: {
          country: addr.country || 'Россия',
          region: addr.region || '',
          city: addr.city || '',
          street: addr.street || '',
          house: addr.house || '',
        }
      });
    }

    if (company.partnerTypeId || company.partner?.partnerTypeId) {
      const typeId = company.partnerTypeId || company.partner?.partnerTypeId;
      const type = this.partnerTypes.find(t => t.id === typeId);
      if (type) {
        this.selectedPartnerType = type;
        this.updateKppValidation();
      }
    }

    if (company.bankId || company.partner?.bankId) {
      const bankId = company.bankId || company.partner?.bankId;
      const bank = this.banks.find(b => b.id === bankId);
      if (bank) {
        this.selectedBank = bank;
        this.partnerForm.patchValue({ bankSearch: bank.partner.shortName });
      }
    }
  }

  // ==================== Валидация шагов ====================
  private validateStep1(): boolean {
    const partnerTypeId = this.partnerForm.get('partnerTypeId')?.value;
    const fullName = this.partnerForm.get('fullName')?.value;
    const shortName = this.partnerForm.get('shortName')?.value;
    const workDirection = this.partnerForm.get('workDirection')?.value;

    return !!(partnerTypeId && fullName && shortName && workDirection);
  }

  private validateStep2(): boolean {
    const lastName = this.partnerForm.get('lastName')?.value;
    const firstName = this.partnerForm.get('firstName')?.value;
    const phoneNumber = this.partnerForm.get('phoneNumber')?.value;
    const email = this.partnerForm.get('email')?.value;
    const emailControl = this.partnerForm.get('email');

    const requiredValid = !!(lastName && firstName && phoneNumber);

    const emailValid = !email || (emailControl?.valid === true);

    return requiredValid && emailValid;
  }

  private validateStep3(): boolean {
    const inn = this.partnerForm.get('inn')?.value;
    const ogrn = this.partnerForm.get('ogrn')?.value;
    const bankId = this.partnerForm.get('bankId')?.value;
    const kpp = this.partnerForm.get('kpp')?.value;

    const requiredValid = !!(inn && ogrn && bankId);
    const kppValid = this.selectedPartnerType?.code === 1
      ? !!(kpp && this.partnerForm.get('kpp')?.valid)
      : true;

    return requiredValid && kppValid;
  }

  private validateStep4(): boolean {
    const country = this.partnerForm.get('address.country')?.value;
    const region = this.partnerForm.get('address.region')?.value;
    const city = this.partnerForm.get('address.city')?.value;
    const street = this.partnerForm.get('address.street')?.value;
    const house = this.partnerForm.get('address.house')?.value;

    return !!(country && region && city && street && house);
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1: return this.validateStep1();
      case 2: return this.validateStep2();
      case 3: return this.validateStep3();
      case 4: return this.validateStep4();
      default: return true;
    }
  }

  markStepAsTouched(): void {
    const fields: Record<number, string[]> = {
      1: ['partnerTypeId', 'fullName', 'shortName'],
      2: ['lastName', 'firstName', 'phoneNumber'],
      3: ['inn', 'ogrn', 'bankId'],
      4: ['address.country', 'address.region', 'address.city', 'address.street', 'address.house']
    };

    fields[this.currentStep]?.forEach(f => {
      this.partnerForm.get(f)?.markAsTouched();
    });

    if (this.currentStep === 3 && this.selectedPartnerType?.code === 1) {
      this.partnerForm.get('kpp')?.markAsTouched();
    }
    if (this.partnerForm.get('email')?.value && this.currentStep === 2) {
      this.partnerForm.get('email')?.markAsTouched();
    }
  }

  nextStep(): void {
    this.markStepAsTouched();

    if (!this.validateCurrentStep()) {
      return;
    }
    if (this.currentStep < 4) {
      this.currentStep++;
      this.scrollToTop();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollToTop();
    }
  }

  private scrollToTop(): void {
    setTimeout(() => {
      const container = document.querySelector('.form-scrollable');
      if (container) container.scrollTop = 0;
    }, 50);
  }

  getFieldError(fieldName: string): string {
    const control = this.partnerForm.get(fieldName);
    if (!control?.errors || !control.touched) return '';

    const errors = control.errors;
    if (errors['required']) return 'Обязательное поле';
    if (errors['email']) return 'Некорректный email';
    if (errors['invalidPhone']) return 'Некорректный телефон';
    if (errors['invalidKpp']) return 'КПП должен содержать 9 цифр';
    if (errors['pattern']) {
      if (fieldName === 'inn') return 'ИНН должен содержать 10 или 12 цифр';
      if (fieldName === 'ogrn') return 'ОГРН должен содержать 13 или 15 цифр';
      if (fieldName === 'kpp') return 'КПП должен содержать 9 цифр';
    }
    return 'Некорректное значение';
  }

  getStepName(step: number): string {
    return ['Основное', 'Контакты', 'Реквизиты', 'Адрес'][step - 1];
  }

  // ==================== Сохранение ====================
  submitForm(): void {
    // Проверяем все шаги
    const isValid = this.validateStep1() && this.validateStep2() &&
      this.validateStep3() && this.validateStep4();

    if (!isValid) {
      // Отмечаем все поля как touched для показа ошибок
      Object.keys(this.partnerForm.controls).forEach(key => {
        const control = this.partnerForm.get(key);
        control?.markAsTouched();
        if (control instanceof FormGroup) {
          Object.keys(control.controls).forEach(subKey => {
            control.get(subKey)?.markAsTouched();
          });
        }
      });
      if (this.selectedPartnerType?.code === 1) {
        this.partnerForm.get('kpp')?.markAsTouched();
      }
      return;
    }

    this.formSubmitting = true;
    this.formError = null;

    const formValue = this.partnerForm.value;
    const partnerCreateDTO = {
      fullName: formValue.fullName,
      shortName: formValue.shortName,
      inn: formValue.inn?.replace(/\D/g, ''),
      ogrn: formValue.ogrn?.replace(/\D/g, ''),
      kpp: formValue.kpp,
      lastName: formValue.lastName,
      firstName: formValue.firstName,
      middleName: formValue.middleName,
      korAccount: formValue.korAccount,
      workDirection: formValue.workDirection,
      phoneNumber: formValue.phoneNumber,
      bankAccount: formValue.bankAccount,
      partnerTypeId: formValue.partnerTypeId,
      address: formValue.address
    };

    const data = { bankId: formValue.bankId, partnerCreateDTO };

    const request$ = this.formMode === 'edit' && this.editingCompany
      ? this.partnerService.updatePartnerUser(data)
      : this.partnerService.setPartnerUser(data);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        console.log('Response:', response);

        if (response && response.success) {
          this.loadCompanies();

          if (this.formMode === 'add' && response.data) {
            const newCompanyId = response.data.id || response.data.partner?.id;
            if (newCompanyId) {
              this.selectedCompanyId = newCompanyId;
              this.selectedCompanyChange.emit(newCompanyId);
            }
            this.companyAdded.emit();
          } else if (this.formMode === 'edit') {
            this.companyEdited.emit(response.data);
          }

          this.closeForm();
        } else {
          this.closeForm();
          this.loadCompanies();
        }
      },
      error: (err) => {
        console.error('Error:', err);
        this.formError = err.error?.message || 'Ошибка сервера';
        this.formSubmitting = false;
      }
    });
  }

  refreshCompanies(): void {
    this.loadCompanies();
  }

  // ==================== Методы выбора компании ====================
  onCompanyClick(company: any): void {
    this.previewedCompany = company;
    this.isSelectionMode = true;
  }

  enterSelectionMode(): void {
    this.isSelectionMode = true;
    if (this.selectedCompanyId) {
      this.previewedCompany = this.companies.find(c => c.id === this.selectedCompanyId);
    }
  }

  previewCompany(company: any): void {
    this.previewedCompany = company;
  }

  confirmSelection(): void {
    if (!this.previewedCompany) return;
    this.selectedCompanyId = this.previewedCompany.id;
    this.selectedCompanyChange.emit(this.selectedCompanyId);
    this.isSelectionMode = false;
  }

  cancelSelection(): void {
    this.isSelectionMode = false;
    this.previewedCompany = null;
  }

  unselectCompany(): void {
    this.selectedCompanyId = null;
    this.selectedCompanyChange.emit(null);
    this.previewedCompany = null;
  }

  selectCompany(companyId: string): void {
    this.selectedCompanyId = companyId;
    this.selectedCompanyChange.emit(companyId);
    this.previewedCompany = this.companies.find(c => c.id === companyId);
  }

  clearSelection(): void {
    this.selectedCompanyId = null;
    this.selectedCompanyChange.emit(null);
    this.previewedCompany = null;
  }

  deleteCompany(companyId: string, event: Event): void {
    event.stopPropagation();
    if (!confirm('Вы уверены, что хотите удалить эту компанию?')) return;

    this.partnerService.deletePartnersUser(companyId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.companies = this.companies.filter(c => c.id !== companyId);
          if (this.selectedCompanyId === companyId) this.clearSelection();
          this.companyDeleted.emit(companyId);
        }
      },
      error: (err) => console.error('Ошибка удаления:', err)
    });
  }

  // ==================== Вспомогательные методы ====================
  getSelectedCompany(): any | undefined {
    return this.companies.find(c => c.id === this.selectedCompanyId);
  }

  getCompanyDisplayName(company: any): string {
    return company.partner?.shortName || company.shortName ||
      company.partner?.fullName || company.fullName ||
      company.partner?.firstName || 'Без названия';
  }

  getCompanyInn(company: any): string {
    return company.partner?.inn || company.inn || '—';
  }

  getCompanyKpp(company: any): string {
    return company.partner?.kpp || company.kpp;
  }

  getCompanyType(company: any): string {
    return company.partnerType?.shortName || company.partner?.partnerType?.shortName || 'Юридическое лицо';
  }

  toggleTypeDropdown(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.typeDropdownOpen = !this.typeDropdownOpen;
    if (this.typeDropdownOpen) {
      this.filteredPartnerTypes = [...this.partnerTypes];
      this.typeSearchQuery = '';
    }
  }

  filterPartnerTypes(): void {
    const query = this.typeSearchQuery.toLowerCase();
    this.filteredPartnerTypes = this.partnerTypes.filter(type =>
      type.fullName.toLowerCase().includes(query) ||
      type.shortName.toLowerCase().includes(query) ||
      type.code.toString().includes(query)
    );
  }

  selectPartnerType(type: PartnerType, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.selectedPartnerType = type;
    this.partnerForm.patchValue({ partnerTypeId: type.id });
    this.typeDropdownOpen = false;
    this.typeSearchQuery = '';
    this.updateKppValidation();
  }
}