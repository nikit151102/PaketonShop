// partner-form.component.ts (обновленный)
import { Component, EventEmitter, Input, Output, OnInit, HostListener, OnDestroy, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize, debounceTime, distinctUntilChanged, takeUntil, delay, catchError } from 'rxjs/operators';
import { Subject, of } from 'rxjs';
import { Router } from '@angular/router';
import { PartnerBankService } from '../../../../../core/api/partner-bank.service';
import { PartnerTypeService } from '../../../../../core/api/partner-type.service';
import { PartnerService } from '../../../../../core/api/partner.service';
import { UserService } from '../../../../../core/services/user.service';
import { UserApiService } from '../../../../../core/api/user.service';

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

interface ContractorSearchResult {
  id: string;
  shortName: string;
  fullName: string;
  inn: string;
  ogrn: string;
  kpp: string;
  address?: {
    region: string;
    city: string;
    street: string;
    house: string;
    postIndex: string;
  };
  partnerType?: {
    id: string;
    code: number;
    fullName: string;
    shortName: string;
  };
}

@Component({
  selector: 'app-partner-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './partner-form.component.html',
  styleUrls: ['./partner-form.component.scss']
})
export class PartnerFormComponent implements OnInit, OnDestroy {
  @Input() partner: any = null;
  @Input() isOpen = true;
  @Output() close = new EventEmitter<void>();
  @Output() saved = new EventEmitter<any>();

  private userService = inject(UserService);
  private userApiService = inject(UserApiService);
  private router = inject(Router);

  partnerForm: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;
  isLoadingUserData = false;

  // Поиск компании
  searchMode = true;
  innSearchValue = '';
  isSearching = false;
  searchResult: ContractorSearchResult | null = null;
  searchError: string | null = null;
  searchAttempted = false;

  // Состояние успешного создания
  successMode = false;
  createdCompanyInn: string | null = null;
  createdCompanyName: string | null = null;

  currentStep = 1;
  selectedPartnerType: PartnerType | null = null;
  selectedBank: PartnerBank | null = null;

  partnerTypes: PartnerType[] = [];
  filteredPartnerTypes: PartnerType[] = [];
  banks: PartnerBank[] = [];
  filteredBanks: PartnerBank[] = [];

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
    this.loadInitialData();
    this.loadUserData();
    this.subscribeToUserData();

    if (this.partner) {
      this.searchMode = false;
      this.loadPartnerData();
    }

    if (this.isOpen) {
      this.open();
    }

    this.partnerForm.get('bankSearch')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(search => this.searchBanks(search));

    this.partnerForm.get('partnerTypeId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.onPartnerTypeChange(value);
      });

    this.partnerForm.get('bankId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(bankId => {
        if (bankId) {
          this.selectedBank = this.banks.find(b => b.id === bankId) || null;
        } else {
          this.selectedBank = null;
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserData(): void {
    this.isLoadingUserData = true;
    this.userApiService.getData().subscribe({
      next: (response) => {
        if (response && response.data) {
          const user = response.data;
          this.partnerForm.patchValue({
            lastName: user.lastName || '',
            firstName: user.firstName || '',
            middleName: user.middleName || '',
            phoneNumber: this.formatPhoneForForm(user.phoneNumber) || '',
            email: user.email || '',
          }, { emitEvent: false });
        }
        this.isLoadingUserData = false;
      },
      error: (error) => {
        console.error('Ошибка загрузки данных пользователя:', error);
        this.isLoadingUserData = false;
      }
    });
  }

  searchCompanyByInn(): void {
    const inn = this.innSearchValue?.trim();

    if (!inn || inn.length === 0) {
      this.searchError = 'Введите ИНН для поиска';
      return;
    }

    const isValidInn = /^\d{10}$|^\d{12}$/.test(inn);
    if (!isValidInn) {
      this.searchError = 'ИНН должен содержать 10 или 12 цифр';
      return;
    }

    this.isSearching = true;
    this.searchError = null;
    this.searchResult = null;

    this.partnerService.getPartnerByInn(inn).pipe(
      delay(500),
      catchError(error => {
        if (error.status === 404) {
          this.searchError = 'Компания с таким ИНН не найдена. Вы можете создать новую';
        } else {
          this.searchError = 'Ошибка при поиске. Попробуйте позже';
        }
        return of(null);
      }),
      finalize(() => {
        this.isSearching = false;
        this.searchAttempted = true;
      })
    ).subscribe(result => {
      if (result && result.data) {
        const contractorData = result.data;
        const hasRequiredData = contractorData.fullName &&
          contractorData.inn &&
          contractorData.ogrn &&
          contractorData.fullName !== '' &&
          contractorData.inn !== '' &&
          contractorData.ogrn !== '';

        if (hasRequiredData) {
          this.searchResult = contractorData;
          this.searchError = null;
        } else {
          this.searchError = 'Компания найдена, но данные неполные. Вы можете заполнить их вручную';
          this.searchResult = null;
        }
      }
    });
  }

  useFoundCompany(): void {
    if (!this.searchResult) return;

    if (this.searchResult.partnerType) {
      this.selectedPartnerType = this.searchResult.partnerType;
      this.partnerForm.patchValue({
        partnerTypeId: this.searchResult.partnerType.id
      });
      this.updateKppValidation();
    }

    this.partnerForm.patchValue({
      fullName: this.searchResult.fullName || '',
      shortName: this.searchResult.shortName || '',
      inn: this.searchResult.inn || '',
      ogrn: this.searchResult.ogrn || '',
      kpp: this.searchResult.kpp || ''
    });

    if (this.searchResult.address) {
      this.partnerForm.patchValue({
        address: {
          country: 'Россия',
          region: this.searchResult.address.region || '',
          city: this.searchResult.address.city || '',
          street: this.searchResult.address.street || '',
          house: this.searchResult.address.house || '',
          postIndex: this.searchResult.address.postIndex || ''
        }
      });
    }

    this.searchMode = false;
    this.searchResult = null;
  }

  createManually(): void {
    this.searchMode = false;
    this.searchResult = null;
    this.searchError = null;
    this.innSearchValue = '';
  }

  backToSearch(): void {
    this.searchMode = true;
    this.searchResult = null;
    this.searchError = null;
    this.innSearchValue = '';
    this.successMode = false;
    this.resetForm();
    this.loadUserData();
  }

  private resetForm(): void {
    this.currentStep = 1;
    this.selectedPartnerType = null;
    this.selectedBank = null;
    this.partnerForm.reset();
    this.partnerForm.patchValue({
      address: {
        country: 'Россия'
      }
    });
  }

  toggleTypeDropdown(): void {
    this.typeDropdownOpen = !this.typeDropdownOpen;
    if (this.typeDropdownOpen) {
      this.filteredPartnerTypes = [...this.partnerTypes];
    }
  }

  filterPartnerTypes(): void {
    if (!this.typeSearchQuery) {
      this.filteredPartnerTypes = [...this.partnerTypes];
      return;
    }

    const query = this.typeSearchQuery.toLowerCase();
    this.filteredPartnerTypes = this.partnerTypes.filter(type =>
      type.fullName.toLowerCase().includes(query) ||
      type.shortName.toLowerCase().includes(query) ||
      type.code.toString().includes(query)
    );
  }

  selectPartnerType(type: PartnerType): void {
    this.selectedPartnerType = type;
    this.partnerForm.patchValue({
      partnerTypeId: type.id
    });
    this.typeDropdownOpen = false;
    this.typeSearchQuery = '';
    this.updateKppValidation();
  }

  getStepName(step: number): string {
    switch (step) {
      case 1: return 'Основное';
      case 2: return 'Контакты';
      case 3: return 'Реквизиты';
      case 4: return 'Адрес';
      default: return '';
    }
  }

  private subscribeToUserData(): void {
    this.userService.user$.pipe(takeUntil(this.destroy$)).subscribe((user: any) => {
      if (user && !this.partner && !this.searchMode && !this.successMode) {
        const currentLastName = this.partnerForm.get('lastName')?.value;
        const currentFirstName = this.partnerForm.get('firstName')?.value;

        if (!currentLastName && user.lastName) {
          this.partnerForm.patchValue({ lastName: user.lastName }, { emitEvent: false });
        }
        if (!currentFirstName && user.firstName) {
          this.partnerForm.patchValue({ firstName: user.firstName }, { emitEvent: false });
        }
        if (!this.partnerForm.get('middleName')?.value && user.middleName) {
          this.partnerForm.patchValue({ middleName: user.middleName }, { emitEvent: false });
        }
        if (!this.partnerForm.get('phoneNumber')?.value && user.phoneNumber) {
          this.partnerForm.patchValue({
            phoneNumber: this.formatPhoneForForm(user.phoneNumber)
          }, { emitEvent: false });
        }
        if (!this.partnerForm.get('email')?.value && user.email) {
          this.partnerForm.patchValue({ email: user.email }, { emitEvent: false });
        }
      }
    });
  }

  private formatPhoneForForm(phone: string): string {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && (cleaned.startsWith('7') || cleaned.startsWith('8'))) {
      return cleaned.substring(1);
    }
    return cleaned;
  }

  private loadInitialData(): void {
    this.loadPartnerTypes();
    this.loadBanks();
  }

  private loadPartnerTypes(): void {
    this.loading = true;
    this.partnerTypeService.getData().subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.partnerTypes = response.data;
          this.filteredPartnerTypes = [...this.partnerTypes];

          if (this.partner?.partnerTypeId) {
            const type = this.partnerTypes.find(t => t.id === this.partner.partnerTypeId);
            if (type) {
              this.selectedPartnerType = type;
              this.partnerForm.patchValue({
                partnerTypeId: this.partner.partnerTypeId
              });
              this.updateKppValidation();
            }
          }
        }
      },
      error: (err) => {
        console.error('Ошибка загрузки типов партнеров:', err);
        this.partnerTypes = [];
        this.filteredPartnerTypes = [];
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  private loadBanks(): void {
    this.bankService.getBanks().subscribe({
      next: (response) => {
        if (response.data && Array.isArray(response.data)) {
          this.banks = response.data;
          this.filteredBanks = [...this.banks];

          if (this.partner?.bankId) {
            const bank = this.banks.find(b => b.id === this.partner.bankId);
            if (bank) {
              this.selectedBank = bank;
              this.partnerForm.patchValue({
                bankId: bank.id,
                bankSearch: bank.partner.shortName
              });
            }
          }
        }
      },
      error: (err) => {
        console.error('Ошибка загрузки банков:', err);
        this.banks = [];
        this.filteredBanks = [];
      }
    });
  }

  private searchBanks(search: string): void {
    if (!search) {
      this.filteredBanks = [];
      return;
    }

    const searchLower = search.toLowerCase();
    this.filteredBanks = this.banks.filter(bank =>
      bank.partner.shortName.toLowerCase().includes(searchLower) ||
      bank.partner.fullName.toLowerCase().includes(searchLower) ||
      bank.bik.toLowerCase().includes(searchLower)
    );
  }

  private onPartnerTypeChange(typeId: string): void {
    if (!typeId) {
      this.selectedPartnerType = null;
      return;
    }

    const type = this.partnerTypes.find(t => t.id === typeId);
    this.selectedPartnerType = type || null;
    this.updateKppValidation();
  }

  private updateKppValidation(): void {
    const kppControl = this.partnerForm.get('kpp');

    if (this.selectedPartnerType?.code === 1) {
      kppControl?.setValidators([Validators.required, this.kppValidator]);
      kppControl?.updateValueAndValidity();
    } else {
      kppControl?.clearValidators();
      kppControl?.setValidators(this.kppValidator);
      kppControl?.updateValueAndValidity();
    }
  }

  private kppValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const regex = /^\d{9}$/;
    return regex.test(value) ? null : { invalidKpp: true };
  }

  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length >= 10 && cleanValue.length <= 15) {
      return null;
    }
    return { invalidPhone: true };
  }

  private createForm(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(200)]],
      shortName: ['', [Validators.required, Validators.maxLength(50)]],
      partnerTypeId: ['', Validators.required],
      workDirection: ['', Validators.required],
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
        house: ['', Validators.required],
        postIndex: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
      })
    });
  }

  private loadPartnerData(): void {
    this.partnerForm.patchValue({
      fullName: this.partner.fullName || '',
      shortName: this.partner.shortName || '',
      partnerTypeId: this.partner.partnerTypeId || '',
      workDirection: this.partner.workDirection || '',
      lastName: this.partner.lastName || '',
      firstName: this.partner.firstName || '',
      middleName: this.partner.middleName || '',
      phoneNumber: this.partner.phoneNumber || '',
      email: this.partner.email || '',
      inn: this.partner.inn || '',
      ogrn: this.partner.ogrn || '',
      kpp: this.partner.kpp || '',
      korAccount: this.partner.korAccount || '',
      bankAccount: this.partner.bankAccount || '',
      bankId: this.partner.bankId || '',
    });

    if (this.partner.address) {
      this.partnerForm.patchValue({
        address: {
          country: this.partner.address.country || 'Россия',
          region: this.partner.address.region || '',
          city: this.partner.address.city || '',
          street: this.partner.address.street || '',
          house: this.partner.address.house || '',
          postIndex: this.partner.address.postIndex || ''
        }
      });
    }

    if (this.partner.partnerTypeId) {
      const type = this.partnerTypes.find(t => t.id === this.partner.partnerTypeId);
      if (type) {
        this.selectedPartnerType = type;
        this.updateKppValidation();
      }
    }
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
    this.partnerForm.patchValue({
      bankId: '',
      bankSearch: ''
    });
  }

  nextStep(): void {
    if (!this.validateCurrentStep()) {
      this.markStepAsTouched();
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

  private markStepAsTouched(): void {
    switch (this.currentStep) {
      case 1:
        ['partnerTypeId', 'fullName', 'shortName', 'workDirection'].forEach(controlName => {
          this.partnerForm.get(controlName)?.markAsTouched();
        });
        break;
      case 2:
        ['lastName', 'firstName', 'phoneNumber'].forEach(controlName => {
          this.partnerForm.get(controlName)?.markAsTouched();
        });
        if (this.partnerForm.get('email')?.value) {
          this.partnerForm.get('email')?.markAsTouched();
        }
        break;
      case 3:
        ['inn', 'ogrn', 'bankId'].forEach(controlName => {
          this.partnerForm.get(controlName)?.markAsTouched();
        });
        if (this.selectedPartnerType?.code === 1) {
          this.partnerForm.get('kpp')?.markAsTouched();
        }
        break;
      case 4:
        ['address.country', 'address.region', 'address.city',
          'address.street', 'address.house', 'address.postIndex'].forEach(controlName => {
            this.partnerForm.get(controlName)?.markAsTouched();
          });
        break;
    }
  }

  private validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.validateStep1();
      case 2:
        return this.validateStep2();
      case 3:
        return this.validateStep3();
      case 4:
        return this.validateStep4();
      default:
        return true;
    }
  }

  private validateStep1(): boolean {
    const controls = ['partnerTypeId', 'fullName', 'shortName', 'workDirection'];
    return controls.every(controlName => {
      const control = this.partnerForm.get(controlName);
      return control?.valid || false;
    });
  }

  private validateStep2(): boolean {
    const requiredControls = ['lastName', 'firstName', 'phoneNumber'];
    const allRequiredValid = requiredControls.every(controlName => {
      const control = this.partnerForm.get(controlName);
      return control?.valid || false;
    });

    const emailControl = this.partnerForm.get('email');
    const emailValid = !emailControl?.value || emailControl.valid;

    return allRequiredValid && emailValid;
  }

  private validateStep3(): boolean {
    const requiredControls = ['inn', 'ogrn', 'bankId'];
    const allRequiredValid = requiredControls.every(controlName => {
      const control = this.partnerForm.get(controlName);
      return control?.valid || false;
    });

    const kppControl = this.partnerForm.get('kpp');
    const kppValid = this.selectedPartnerType?.code === 1
      ? (kppControl?.valid || false)
      : true;

    return allRequiredValid && kppValid;
  }

  private validateStep4(): boolean {
    const addressControls = ['country', 'region', 'city', 'street', 'house', 'postIndex'];
    return addressControls.every(controlName => {
      const control = this.partnerForm.get(`address.${controlName}`);
      return control?.valid || false;
    });
  }

  private scrollToTop(): void {
    setTimeout(() => {
      const modal = document.querySelector('.form-scrollable');
      if (modal) {
        modal.scrollTop = 0;
      }
    }, 50);
  }

  getFieldError(fieldName: string): string {
    const control = this.partnerForm.get(fieldName);
    if (!control?.errors || !control.touched) return '';

    const errors = control.errors;

    if (errors['required']) {
      return 'Обязательное поле';
    }

    if (errors['maxlength']) {
      return 'Слишком длинное значение';
    }

    if (errors['email']) {
      return 'Некорректный email';
    }

    if (errors['pattern']) {
      if (fieldName.includes('postIndex')) {
        return 'Индекс должен содержать 6 цифр';
      }
      switch (fieldName) {
        case 'inn':
          return 'ИНН должен содержать 10 или 12 цифр';
        case 'ogrn':
          return 'ОГРН должен содержать 13 или 15 цифр';
        case 'kpp':
          return 'КПП должен содержать 9 цифр';
      }
    }

    if (errors['invalidKpp']) {
      return 'Некорректный КПП (должно быть 9 цифр)';
    }

    if (errors['invalidPhone']) {
      return 'Некорректный телефон';
    }

    return 'Некорректное значение';
  }

  submit(): void {
    if (!this.validateStep1() || !this.validateStep2() ||
      !this.validateStep3() || !this.validateStep4()) {
      this.markStepAsTouched();
      this.partnerForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    this.error = null;

    const formData = this.prepareFormData();

    const request$ = this.partner
      ? this.partnerService.updatePartnerUser(formData)
      : this.partnerService.setPartnerUser(formData);

    request$
      .pipe(
        finalize(() => this.submitting = false)
      )
      .subscribe({
        next: (response) => {
          if (response && response.data) {
            const responseData = response.data;
            const partnerData = responseData.partner || responseData;

            this.createdCompanyInn = partnerData?.inn || this.partnerForm.get('inn')?.value;
            this.createdCompanyName = partnerData?.fullName || partnerData?.shortName || this.partnerForm.get('fullName')?.value;

            this.successMode = true;
            this.searchMode = false;

            this.saved.emit(response.data);
          } else {
            this.error = response?.message || 'Ошибка при сохранении';
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Ошибка сервера';
          console.error('Ошибка сохранения партнера:', err);
        }
      });
  }


  goToContractRegistration(): void {
    console.log('createdCompanyInn:', this.createdCompanyInn); // Добавьте отладку

    if (this.createdCompanyInn) {
      this.closeForm();
      console.log('Navigating to /register-business with inn:', this.createdCompanyInn);
      this.router.navigate(['/register-business'], { queryParams: { inn: this.createdCompanyInn } });
    } else {
      console.error('createdCompanyInn is empty!');
    }
  }

  private prepareFormData(): any {
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
    };

    const data: any = {
      bankId: formValue.bankId,
      partnerCreateDTO: partnerCreateDTO
    };

    if (formValue.address) {
      data.partnerCreateDTO.address = formValue.address;
    }

    return data;
  }

  open(): void {
    this.isOpen = true;
    document.body.style.overflow = 'hidden';
    this.successMode = false;
    this.searchMode = true;
    this.searchResult = null;
    this.searchError = null;
    this.innSearchValue = '';
  }

  closeForm(): void {
    this.isOpen = false;
    document.body.style.overflow = '';
    this.close.emit();

    this.searchMode = true;
    this.successMode = false;
    this.searchResult = null;
    this.searchError = null;
    this.innSearchValue = '';
    this.searchAttempted = false;
    this.currentStep = 1;
    this.selectedPartnerType = null;
    this.selectedBank = null;
    this.error = null;
    this.createdCompanyInn = null;
    this.createdCompanyName = null;
    this.partnerForm.reset();
    this.partnerForm.patchValue({
      address: {
        country: 'Россия'
      }
    });
  }

  cancel(): void {
    this.closeForm();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: any): void {
    if (this.isOpen) {
      this.cancel();
    }
  }
}