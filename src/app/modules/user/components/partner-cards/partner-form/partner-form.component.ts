import { Component, EventEmitter, Input, Output, OnInit, HostListener, OnDestroy } from '@angular/core';
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
import { finalize, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { PartnerBankService } from '../../../../../core/api/partner-bank.service';
import { PartnerTypeService } from '../../../../../core/api/partner-type.service';
import { PartnerService } from '../../../../../core/api/partner.service';

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

  partnerForm: FormGroup;
  loading = false;
  submitting = false;
  error: string | null = null;
  
  currentStep = 1;
  selectedPartnerType: PartnerType | null = null;
  
  // Данные для выпадающих списков
  partnerTypes: PartnerType[] = [];
  filteredPartnerTypes: PartnerType[] = [];
  banks: PartnerBank[] = [];
  filteredBanks: PartnerBank[] = [];
  
  // Для поиска
  typeSearchQuery = '';
  
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
    
    if (this.partner) {
      this.loadPartnerData();
    }
    
    if (this.isOpen) {
      this.open();
    }
    
    // Подписка на изменение поиска банков
    this.partnerForm.get('bankSearch')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(search => this.searchBanks(search));

    // Подписка на изменение типа партнера
    this.partnerForm.get('partnerTypeId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.onPartnerTypeChange(value);
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
          
          // Если партнер уже выбран, устанавливаем его значение
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

  selectPartnerType(type: PartnerType): void {
    this.selectedPartnerType = type;
    this.partnerForm.patchValue({
      partnerTypeId: type.id
    });
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
    
    if (this.selectedPartnerType?.code === 1) { // Юридическое лицо
      kppControl?.setValidators([Validators.required, this.kppValidator]);
      kppControl?.updateValueAndValidity();
    } else {
      kppControl?.clearValidators();
      kppControl?.setValidators(this.kppValidator);
      kppControl?.updateValueAndValidity();
    }
  }

  // Валидаторы
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
      // Шаг 1: Основная информация
      fullName: ['', [Validators.required, Validators.maxLength(200)]],
      shortName: ['', [Validators.required, Validators.maxLength(50)]],
      partnerTypeId: ['', Validators.required],
      workDirection: ['', Validators.required],
      
      // Шаг 2: Контакты
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      phoneNumber: ['', [Validators.required, this.phoneValidator]],
      email: ['', [Validators.email]],
      
      // Шаг 3: Реквизиты и банк
      inn: ['', [Validators.required, Validators.pattern(/^\d{10}$|^\d{12}$/)]],
      ogrn: ['', [Validators.required, Validators.pattern(/^\d{13}$|^\d{15}$/)]],
      kpp: ['', this.kppValidator],
      korAccount: [''],
      bankAccount: [''],
      bankId: [''],
      bankSearch: [''],
      
      // Шаг 4: Адрес
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
    
    // Находим и устанавливаем выбранный тип партнера
    if (this.partner.partnerTypeId) {
      const type = this.partnerTypes.find(t => t.id === this.partner.partnerTypeId);
      if (type) {
        this.selectedPartnerType = type;
        this.updateKppValidation();
      }
    }
  }

  // Обработчики событий
  onBankSelect(bank: PartnerBank): void {
    this.partnerForm.patchValue({
      bankId: bank.id,
      bankSearch: bank.partner.shortName
    });
  }

  clearBankSelection(): void {
    this.partnerForm.patchValue({
      bankId: '',
      bankSearch: ''
    });
  }

  // Управление шагами
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
        ['inn', 'ogrn'].forEach(controlName => {
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
    const requiredControls = ['inn', 'ogrn'];
    const allRequiredValid = requiredControls.every(controlName => {
      const control = this.partnerForm.get(controlName);
      return control?.valid || false;
    });
    
    // Проверяем КПП только для юр.лиц (код 1)
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
      const modal = document.querySelector('.form-content');
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
    // Проверяем все шаги перед отправкой
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
          if (response.success && response.data) {
            this.saved.emit(response.data);
            this.closeForm();
          } else {
            this.error = response.message || 'Ошибка при сохранении';
          }
        },
        error: (err) => {
          this.error = err.error?.message || 'Ошибка сервера';
          console.error('Ошибка сохранения партнера:', err);
        }
      });
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
  }

  closeForm(): void {
    this.isOpen = false;
    document.body.style.overflow = '';
    this.close.emit();
    
    // Сброс формы
    this.partnerForm.reset();
    this.currentStep = 1;
    this.selectedPartnerType = null;
    this.error = null;
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