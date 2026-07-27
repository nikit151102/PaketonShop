import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormsModule, AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, delay, catchError, of, switchMap, finalize, map } from 'rxjs';
import { localStorageEnvironment } from '../../../environment';
import { StorageUtils } from '../../../utils/storage.utils';
import { PartnerBankService } from '../../core/api/partner-bank.service';
import { PartnerService } from '../../core/api/partner.service';
import { UserApiService } from '../../core/api/user.service';
import { CreateWholesaleOrderDto, WholesaleOrderService } from '../../core/api/wholesale-order.service';
import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

export interface InnDetailsDto {
  fullName: string;
  shortName: string;
  inn: string;
  ogrn: string;
  address?: {
    region: string;
    city: string;
    street: string;
    house: string;
    postIndex: string;
  };
}

export interface CheckInnResponseDto {
  success: boolean;
  inn: string;
  details?: InnCheckDetailsDto | null;
}

export interface PartnerInfoDto {
  id?: string | null;
  shortName: string;
  fullName: string;
  inn: string;
  ogrn: string;
  kpp?: string | null;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  typeOfActivity?: string | null;
  address?: {
    region?: string;
    city?: string;
    street?: string;
    house?: string;
    postIndex?: string;
  } | null;
}

export interface SelfEmployedDto {
  is_self_employed: boolean;
  message: string;
}

export interface InnCheckDetailsDto {
  partnerInfo: PartnerInfoDto | null;
  self_employed: SelfEmployedDto | null;
  company_info?: any;
}

export interface InnCheckResultDto {
  success: boolean;
  inn: string;
  details?: InnCheckDetailsDto | null;
}

interface BusinessAccountData {
  user: any;
  company: any;
  documents: DocumentData[];
}

interface DocumentData {
  type: number;
  file: File;
  fileName: string;
  fileType: string;
  fileSize: number;
}

interface PartnerType {
  id: string;
  code: number;
  fullName: string;
  shortName: string;
}

interface Partner {
  id: string;
  fullName: string;
  shortName: string;
  inn: string;
  ogrn: string;
  kpp: string;
  workDirection: string;
  partnerType: PartnerType;
  address: any;
  phoneNumber?: string;
  email?: string;
}

interface FieldError {
  field: string;
  message: string;
}

const animations = [
  trigger('fadeSlide', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(20px)' }),
      animate('400ms cubic-bezier(0.34, 1.2, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0)' }))
    ]),
    transition(':leave', [
      animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 0, transform: 'translateY(20px)' }))
    ])
  ]),
  trigger('fadeIn', [
    transition(':enter', [
      style({ opacity: 0 }),
      animate('600ms ease-out', style({ opacity: 1 }))
    ])
  ]),
  trigger('slideDown', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateY(-15px)', height: 0 }),
      animate('350ms cubic-bezier(0.34, 1.2, 0.64, 1)', style({ opacity: 1, transform: 'translateY(0)', height: '*' }))
    ]),
    transition(':leave', [
      animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-15px)', height: 0 }))
    ])
  ]),
  trigger('bounceIn', [
    transition(':enter', [
      style({ opacity: 0, transform: 'scale(0.9)' }),
      animate('400ms cubic-bezier(0.34, 1.2, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' }))
    ])
  ]),
  trigger('slideInRight', [
    transition(':enter', [
      style({ opacity: 0, transform: 'translateX(-20px)' }),
      animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
    ])
  ])
];

@Component({
  selector: 'app-self-employed-registration',
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './self-employed-registration.component.html',
  styleUrl: './self-employed-registration.component.scss',
  animations: animations
})
export class SelfEmployedRegistrationComponent implements OnInit, OnDestroy {
  currentStep = 1;
  totalSteps = 2;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  fieldErrors: FieldError[] = [];
  success = false;
  showHelp = false;
  showPassword = false;
  showConfirmPassword = false;
  uploadMethod: 'single' | 'archive' = 'single';
  archiveFile: File | null = null;
  isDragOver = false;
  isActivePartner: boolean = false;

  companyId: string = '';
  existingPartner: Partner | null = null;
  isLoadingPartner = false;
  hideFirstTwoSteps = false;

  isRegisteringUser = false;
  userRegistered = false;
  registeredUserId: string | null = null;
  registeredUserToken: string | null = null;

  userForm: FormGroup;
  companyForm: FormGroup;

  accountData: BusinessAccountData = {
    user: {} as any,
    company: {} as any,
    documents: []
  };

  partnerTypes: PartnerType[] = [
    { id: '2', code: 16, fullName: 'Индивидуальный предприниматель', shortName: 'ИП' },
    { id: '3', code: 17, fullName: 'Самозанятый (НПД)', shortName: 'Самозанятый' }
  ];

  selectedPartnerType: PartnerType | null = null;
  companyRegistrationDate: Date | null = null;

  innSearchValue: string = '';
  isCheckingInn = false; // Было isSearchingByInn
  innCheckResult: CheckInnResponseDto | null = null; // Новый результат
  innCheckError: string | null = null;
  searchProgress = 0;

  documentTypes: any = [
    { id: 9, name: 'Паспорт (разворот с фото и пропиской)', requiredFor: [16, 17], optionalFor: [] },
    { id: 10, name: 'Свидетельство о регистрации ИП (ОГРНИП)', requiredFor: [16], optionalFor: [] },
    { id: 11, name: 'Справка о постановке на учет НПД', requiredFor: [17], optionalFor: [] }
  ];

  uploadedDocuments: DocumentData[] = [];

  progress = {
    step1: false,
    step2: false
  };

  passwordStrength = {
    level: 0,
    hints: [] as { message: string; valid: boolean }[]
  };

  private destroy$ = new Subject<void>();
  isActiveUser: boolean = false;
  pkt_c1: any;

  constructor(
    private fb: FormBuilder,
    private userApiService: UserApiService,
    private userService: UserService,
    public router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private partnerService: PartnerService,
    private partnerBankService: PartnerBankService,
    private wholesaleOrderService: WholesaleOrderService
  ) {
    this.userForm = this.createUserForm();
    this.companyForm = this.createCompanyForm();
  }

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.companyId = params['companyId'] || null;
      const inn = params['inn'] || null;
      this.pkt_c1 = params['pkt_c1'] || null;

      if (this.companyId) {
        const authToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);
        if (authToken) {
          this.loadUserDataAndPartner();
          this.hideFirstTwoSteps = true;
          this.currentStep = 2;
          this.userRegistered = true;
        }
      } else if (inn) {
        this.checkIfUserAuthenticatedForInn(inn);
      } else {
        this.checkIfUserAuthenticated();
      }
    });

    this.loadPartnerTypes();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private checkIfUserAuthenticatedForInn(inn: string): void {
    const authToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);
    if (authToken) {
      this.userApiService.getData().pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => {
          if (response && response.data) {
            const user = response.data;
            this.isActiveUser = true;
            this.userRegistered = true;
            this.registeredUserId = user.id;

            let birthdayValue = null;
            if (user.birthday) {
              const date = new Date(user.birthday);
              birthdayValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            }

            this.userForm.patchValue({
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              middleName: user.middleName,
              birthday: birthdayValue,
              phoneNumber: user.phoneNumber,
              agreeToTerms: true,
              password: '',
              confirmPassword: ''
            });

            this.updateUserFormValidators();
            this.progress.step1 = true;
            this.innSearchValue = inn;
            this.currentStep = 2;
          }
        }
      });
    } else {
      this.currentStep = 1;
      this.innSearchValue = inn;
    }
  }

  private checkIfUserAuthenticated(): void {
    const authToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);
    if (authToken) {
      this.loadUserData();
      this.userRegistered = true;
    }
  }

  registerUserBeforeStep2(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.userRegistered) {
        resolve(true);
        return;
      }

      if (!this.userForm.valid) {
        this.markCurrentStepAsTouched();
        this.collectFieldErrors();
        reject(false);
        return;
      }

      this.isRegisteringUser = true;
      this.error = null;

      const birthdayValue = this.userForm.get('birthday')?.value;
      let formattedBirthday = null;
      if (birthdayValue) {
        const date = new Date(birthdayValue);
        if (!isNaN(date.getTime())) formattedBirthday = date.toISOString();
      }

      const registerData = {
        email: this.userForm.get('email')?.value,
        password: this.userForm.get('password')?.value,
        isEmailSend: 'false',
      };

      this.authService.register(registerData).pipe(
        switchMap((response) => {
          const token = response.data.token;
          this.registeredUserToken = token;
          StorageUtils.setLocalStorageCache(localStorageEnvironment.auth.key, token, localStorageEnvironment.auth.ttl);

          const userFormData = {
            firstName: this.userForm.get('firstName')?.value,
            lastName: this.userForm.get('lastName')?.value,
            middleName: this.userForm.get('middleName')?.value || '',
            birthday: formattedBirthday,
            phoneNumber: this.userForm.get('phoneNumber')?.value,
            email: this.userForm.get('email')?.value
          };

          return this.userApiService.updateData(userFormData).pipe(
            switchMap(() => this.userApiService.getData())
          );
        }),
        catchError(error => {
          this.error = error.error?.message || 'Ошибка при регистрации пользователя';
          this.isRegisteringUser = false;
          reject(false);
          return of(null);
        })
      ).subscribe({
        next: (userData) => {
          if (userData && userData.data) {
            this.userService.setUser(userData.data, 'session', true);
            this.registeredUserId = userData.data.id;
            this.userRegistered = true;
            this.progress.step1 = true;
            this.isRegisteringUser = false;
            this.accountData.user = { ...this.userForm.value, birthday: formattedBirthday };
            resolve(true);
          } else {
            this.isRegisteringUser = false;
            reject(false);
          }
        },
        error: () => {
          this.isRegisteringUser = false;
          reject(false);
        }
      });
    });
  }

  private loadUserData(): void {
    this.userApiService.getData().pipe(catchError(() => of(null))).subscribe({
      next: (response) => {
        if (response && response.data) {
          const user = response.data;
          this.isActiveUser = true;
          this.userRegistered = true;
          this.registeredUserId = user.id;

          let birthdayValue = null;
          if (user.birthday) {
            const date = new Date(user.birthday);
            birthdayValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          }

          this.userForm.patchValue({
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            middleName: user.middleName,
            birthday: birthdayValue,
            phoneNumber: user.phoneNumber,
            agreeToTerms: true,
            password: '',
            confirmPassword: ''
          });
          this.updateUserFormValidators();
          this.progress.step1 = true;
          if (!this.companyId) this.currentStep = 2;
        }
      }
    });
  }

  private loadUserDataAndPartner(): void {
    this.isLoadingPartner = true;
    this.userApiService.getData().pipe(
      switchMap((response) => {
        const user = response.data;
        this.isActiveUser = true;
        this.userRegistered = true;
        this.registeredUserId = user.id;

        let birthdayValue = null;
        let formattedBirthday = null;
        if (user.birthday) {
          formattedBirthday = user.birthday;
          const date = new Date(user.birthday);
          if (!isNaN(date.getTime())) {
            birthdayValue = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          }
        }

        this.userForm.patchValue({
          email: user.email, firstName: user.firstName, lastName: user.lastName,
          middleName: user.middleName, birthday: birthdayValue, phoneNumber: user.phoneNumber,
          agreeToTerms: true, password: '', confirmPassword: ''
        });
        this.updateUserFormValidators();
        this.accountData.user = { ...this.userForm.value, birthday: formattedBirthday };
        this.progress.step1 = true;

        return this.partnerService.getPartnerById(this.companyId!);
      }),
      catchError(() => of(null))
    ).subscribe({
      next: (partnerResponse) => {
        this.isLoadingPartner = false;
        if (partnerResponse && partnerResponse.data) {
          this.existingPartner = partnerResponse.data;
          this.selectedPartnerType = partnerResponse.data.partner?.partnerType;
          this.populateCompanyForm();
          this.progress.step2 = true;
          this.isActivePartner = true;
        }
      }
    });
  }

  private populateCompanyForm(): void {
    if (!this.existingPartner) return;
    const partner = this.existingPartner;
    if (partner.partnerType) {
      this.selectedPartnerType = partner.partnerType;
      this.companyForm.patchValue({ partnerTypeId: partner.partnerType.id });
    }
    this.companyForm.patchValue({
      fullName: partner.fullName || '', shortName: partner.shortName || '',
      workDirection: partner.workDirection || '', inn: partner.inn || '',
      ogrn: partner.ogrn || '', kpp: partner.kpp || ''
    });
    if (partner.address) {
      this.companyForm.patchValue({
        address: {
          country: partner.address.country || 'Россия', region: partner.address.region || '',
          city: partner.address.city || '', street: partner.address.street || '',
          house: partner.address.house || '', postIndex: partner.address.postIndex || ''
        }
      });
    }
    this.accountData.company = {
      id: partner.id, fullName: partner.fullName, shortName: partner.shortName,
      inn: partner.inn, ogrn: partner.ogrn, kpp: partner.kpp || '',
      partnerTypeId: partner.partnerType?.id || '', workDirection: partner.workDirection || '',
      address: partner.address ? {
        country: partner.address.country || 'Россия', region: partner.address.region || '',
        city: partner.address.city || '', street: partner.address.street || '',
        house: partner.address.house || '', postIndex: partner.address.postIndex || ''
      } : { country: 'Россия', region: '', city: '', street: '', house: '', postIndex: '' }
    };
    this.updateKppValidation();
  }



  checkInnStatus(): void {
    const inn = this.innSearchValue?.trim();
    if (!inn || !/^\d{10}$|^\d{12}$/.test(inn)) {
      this.innCheckError = 'ИНН должен содержать 10 или 12 цифр';
      return;
    }

    // ✅ Определяем тип на основе выбранного partnerType
    const selectedType = this.companyForm.get('partnerTypeId')?.value;
    const apiType = selectedType === '2' ? 0 : selectedType === '3' ? 1 : 0; // 0 = ИП, 1 = Самозанятый

    this.isCheckingInn = true;
    this.innCheckError = null;
    this.innCheckResult = null;
    this.searchProgress = 0;

    const progressInterval = setInterval(() => {
      if (this.searchProgress < 90) this.searchProgress += 10;
    }, 100);
    this.partnerService.selfEmployedInnChecker(inn, apiType).pipe(
      delay(500),
      catchError(error => {
        clearInterval(progressInterval);
        this.innCheckError = error.status === 404
          ? 'Данный ИНН не найден или не является действующим'
          : 'Ошибка при проверке. Попробуйте позже';
        return of(null);
      }),
      finalize(() => {
        clearInterval(progressInterval);
        setTimeout(() => {
          this.isCheckingInn = false;
          this.searchProgress = 0;
        }, 500);
      })
    ).subscribe(result => {
      if (result?.data?.[0]) {
        const checkResult = result.data[0];
        this.innCheckResult = {
          success: checkResult.success,
          inn: checkResult.inn,
          details: checkResult.details
        };

        if (checkResult.success) {
          // ✅ Обработка для ИП (type: 0)
          if (apiType === 0 && checkResult.details?.partnerInfo) {
            const partnerInfo = checkResult.details.partnerInfo;

            this.selectedPartnerType = this.partnerTypes.find(t => t.code === 16) || null;
            this.companyForm.patchValue({
              partnerTypeId: this.selectedPartnerType?.id,
              fullName: partnerInfo.fullName || '',
              shortName: partnerInfo.shortName || '',
              inn: partnerInfo.inn || inn,
              ogrn: partnerInfo.ogrn || '',
              workDirection: partnerInfo.typeOfActivity || ''
            });

            // Заполнение адреса если есть
            if (partnerInfo.address) {
              this.companyForm.get('address')?.patchValue({
                region: partnerInfo.address.region || '',
                city: partnerInfo.address.city || '',
                street: partnerInfo.address.street || '',
                house: partnerInfo.address.house || '',
                postIndex: partnerInfo.address.postIndex || ''
              });
            }

            this.progress.step2 = true;
            this.showSuccessToast('Данные ИП успешно загружены!');
          }
          // ✅ Обработка для Самозанятого (type: 1)
          else if (apiType === 1 && checkResult.details?.self_employed?.is_self_employed) {
            this.selectedPartnerType = this.partnerTypes.find(t => t.code === 17) || null;
            this.companyForm.patchValue({
              partnerTypeId: this.selectedPartnerType?.id,
              inn: inn,
              // Формируем ФИО из данных пользователя если есть
              fullName: `${this.userForm.get('lastName')?.value || ''} ${this.userForm.get('firstName')?.value || ''} ${this.userForm.get('middleName')?.value || ''}`.trim(),
              shortName: `${this.userForm.get('lastName')?.value || ''} ${this.userForm.get('firstName')?.value?.[0] || ''}.${this.userForm.get('middleName')?.value?.[0] || ''}`.trim()
            });
            this.progress.step2 = true;
            this.showSuccessToast('Статус плательщика НПД подтвержден!');
          }
          else {
            // ❌ Успешный ответ, но не тот тип
            this.innCheckError = apiType === 0
              ? 'Данный ИНН не зарегистрирован как ИП'
              : 'Данный ИНН не является плательщиком НПД';
          }
        } else {
          this.innCheckError = 'Статус не подтвержден. Проверьте корректность ИНН.';
        }
      }
    });
  }


  resetInnCheck(): void {
    this.innSearchValue = '';
    this.innCheckResult = null;
    this.innCheckError = null;
    this.isCheckingInn = false;
    this.searchProgress = 0;
    this.companyForm.reset();
    this.progress.step2 = false;
  }

  updateInnSearch(): void {
    if (this.innCheckResult || this.innCheckError) {
      this.resetInnCheck();
    }
  }
  // --------------------------------

  private updateUserFormValidators(): void {
    const passwordControl = this.userForm.get('password');
    const confirmPasswordControl = this.userForm.get('confirmPassword');
    if (this.isActiveUser) {
      passwordControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
    } else {
      passwordControl?.setValidators([Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]);
      confirmPasswordControl?.setValidators([Validators.required]);
    }
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
  }

  private collectFieldErrors(): void {
    this.fieldErrors = [];
    const formControls = this.userForm.controls;
    for (const controlName in formControls) {
      const control = formControls[controlName];
      if (this.isActiveUser && (controlName === 'password' || controlName === 'confirmPassword')) continue;
      if (control.invalid && control.touched) {
        let message = '';
        if (control.errors?.['required']) message = this.getFieldLabel(controlName) + ' обязательно для заполнения';
        else if (control.errors?.['email']) message = 'Введите корректный email';
        else if (control.errors?.['minlength']) message = this.getFieldLabel(controlName) + ' должен содержать минимум ' + control.errors['minlength'].requiredLength + ' символов';
        else if (control.errors?.['pattern']) message = this.getFieldLabel(controlName) + ' имеет неверный формат';
        else if (control.errors?.['mismatch']) message = 'Пароли не совпадают';
        this.fieldErrors.push({ field: controlName, message });
      }
    }
  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      email: 'Email', password: 'Пароль', confirmPassword: 'Подтверждение пароля',
      firstName: 'Имя', lastName: 'Фамилия', middleName: 'Отчество',
      phoneNumber: 'Телефон', birthday: 'Дата рождения', agreeToTerms: 'Согласие с условиями'
    };
    return labels[fieldName] || fieldName;
  }

  async nextStep(): Promise<void> {
    if (this.currentStep === 1) {
      if (this.isActiveUser) {
        const isValid = !!(this.userForm.get('email')?.valid && this.userForm.get('firstName')?.valid &&
          this.userForm.get('lastName')?.valid && this.userForm.get('phoneNumber')?.valid && this.userForm.get('agreeToTerms')?.valid);
        if (!isValid) {
          this.markCurrentStepAsTouched();
          this.collectFieldErrors();
          this.error = 'Пожалуйста, заполните все обязательные поля';
          this.scrollToTop();
          return;
        }
        this.currentStep++;
        this.scrollToTop();
        return;
      }

      if (!this.userForm.valid) {
        this.markCurrentStepAsTouched();
        this.collectFieldErrors();
        this.error = 'Пожалуйста, заполните все обязательные поля';
        this.scrollToTop();
        return;
      }

      this.isLoading = true;
      this.error = null;
      try {
        const registered = await this.registerUserBeforeStep2();
        if (registered) {
          this.currentStep++;
          this.scrollToTop();
          if (this.innSearchValue) {
            this.checkInnStatus(); // Автопроверка, если ИНН был в URL
          }
        }
      } catch (error) { } finally {
        this.isLoading = false;
      }
    }
  }

  private showSuccessToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `<div class="toast-content"><div class="toast-icon">✓</div><div class="toast-message">${message}</div></div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  private createUserForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)]],
      confirmPassword: ['', Validators.required],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      middleName: [''],
      birthday: [''],
      phoneNumber: ['', [Validators.required, this.phoneValidator]],
      agreeToTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  private createCompanyForm(): FormGroup {
    return this.fb.group({
      fullName: ['', [Validators.required, Validators.maxLength(200)]],
      shortName: ['', [Validators.required, Validators.maxLength(50)]],
      partnerTypeId: ['', Validators.required],
      workDirection: [''],
      inn: ['', [Validators.required, this.innValidator]],
      ogrn: ['', [Validators.required, Validators.pattern(/^\d{13}$|^\d{15}$/)]],
      kpp: ['', this.kppValidator],
      registrationDate: [''],
      address: this.fb.group({
        country: ['Россия', Validators.required],
        region: ['', Validators.required],
        city: ['', Validators.required],
        street: ['', Validators.required],
        house: ['', Validators.required],
        postIndex: ['', [Validators.pattern(/^\d{6}$/)]]
      })
    });
  }

  private innValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const cleanValue = value.replace(/\D/g, '');
    return (cleanValue.length === 10 || cleanValue.length === 12) ? null : { invalidInn: true };
  }

  private passwordMatchValidator(g: FormGroup): ValidationErrors | null {
    return g.get('password')?.value === g.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    return value.replace(/\D/g, '').length >= 10 ? null : { invalidPhone: true };
  }

  private kppValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    return /^\d{9}$/.test(value) ? null : { invalidKpp: true };
  }

  private loadPartnerTypes(): void {
    this.partnerTypes = [
      { id: '2', code: 16, fullName: 'Индивидуальный предприниматель', shortName: 'ИП' },
      { id: '3', code: 17, fullName: 'Самозанятый (НПД)', shortName: 'Самозанятый' }
    ];
  }

  private setupFormListeners(): void {
    this.companyForm.get('partnerTypeId')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(value => {
      this.selectedPartnerType = this.partnerTypes.find(t => t.id === value) || null;
      this.updateKppValidation();
    });
    this.userForm.get('password')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(password => {
      this.updatePasswordStrength(password);
    });
    this.companyForm.get('registrationDate')?.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(date => {
      this.companyRegistrationDate = date ? new Date(date) : null;
    });
  }

  private updateKppValidation(): void {
    const kppControl = this.companyForm.get('kpp');
    if (this.selectedPartnerType?.code === 1) { // Если вдруг добавите ООО
      kppControl?.setValidators([Validators.required, this.kppValidator]);
    } else {
      kppControl?.clearValidators();
    }
    kppControl?.updateValueAndValidity();
  }

  getRequiredDocuments(): any[] {
    if (!this.selectedPartnerType) return [];
    return this.documentTypes.filter((doc: any) => doc.requiredFor.includes(this.selectedPartnerType!.code));
  }

  getProgressPercentage(): number {
    let progress = 0;
    if (this.progress.step1) progress += 50;
    if (this.progress.step2) progress += 50;
    return progress;
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollToTop();
      this.error = null;
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps && step <= this.currentStep) {
      this.currentStep = step;
      this.scrollToTop();
      this.error = null;
    }
  }

  private markCurrentStepAsTouched(): void {
    if (this.currentStep === 1) {
      if (this.isActiveUser) {
        ['email', 'firstName', 'lastName', 'phoneNumber', 'agreeToTerms'].forEach(field => this.userForm.get(field)?.markAsTouched());
      } else {
        Object.values(this.userForm.controls).forEach(control => control.markAsTouched());
      }
    } else if (this.currentStep === 2) {
      this.companyForm.markAllAsTouched();
    }
  }

  getStepTitle(step: number): string {
    if (this.hideFirstTwoSteps && step < 2) return '';
    return step === 1 ? 'Пользователь' : 'Проверка и документы';
  }

  getStepSubtitle(step: number): string {
    if (this.hideFirstTwoSteps && step < 2) return '';
    return step === 1 ? 'Контактные данные' : 'Статус и верификация';
  }

  getStepStatus(step: number): string {
    if (this.hideFirstTwoSteps && step < 2) return 'completed';
    if (this.currentStep === step) return 'active';
    if (step === 1 && this.progress.step1) return 'completed';
    if (step === 2 && this.progress.step2) return 'completed';
    return 'pending';
  }

  getStepGuideText(): string {
    if (this.hideFirstTwoSteps && this.currentStep === 2) return 'Загрузите необходимые документы для завершения регистрации';
    return this.currentStep === 1 ? 'Заполните все поля для создания учетной записи' : 'Проверьте ИНН и загрузите документы';
  }

  getCurrentStepHelp(): string {
    return this.currentStep === 1
      ? 'Заполните точные контактные данные. Это важно для восстановления доступа.'
      : 'Введите ИНН. Система проверит, являетесь ли вы действующим ИП или плательщиком НПД (самозанятым).';
  }

  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  getEmailErrorMessage(): string {
    const errors = this.userForm.get('email')?.errors;
    if (errors?.['required']) return 'Введите email';
    if (errors?.['email']) return 'Неверный формат email';
    return '';
  }

  onPasswordChange(): void {
    this.updatePasswordStrength(this.userForm.get('password')?.value);
  }

  updatePasswordStrength(password: string): void {
    this.passwordStrength.hints = [];
    if (!password) { this.passwordStrength.level = 0; return; }
    let level = 0;
    const checks = [
      { test: password.length >= 8, msg: 'Не менее 8 символов' },
      { test: /[A-Za-z]/.test(password), msg: 'Содержит буквы' },
      { test: /\d/.test(password), msg: 'Содержит цифры' },
      { test: /[^A-Za-z0-9]/.test(password), msg: 'Содержит спецсимволы' },
      { test: /[A-Z]/.test(password) && /[a-z]/.test(password), msg: 'Смешанный регистр' }
    ];
    checks.forEach(check => {
      if (check.test) { level++; this.passwordStrength.hints.push({ message: check.msg, valid: true }); }
      else { this.passwordStrength.hints.push({ message: check.msg, valid: false }); }
    });
    this.passwordStrength.level = level;
  }

  getPasswordStrengthLevel(): number { return Math.min(this.passwordStrength.level, 5); }
  togglePasswordVisibility(): void { this.showPassword = !this.showPassword; }
  toggleConfirmPasswordVisibility(): void { this.showConfirmPassword = !this.showConfirmPassword; }
  passwordsMatch(): boolean {
    return this.userForm.get('password')?.value === this.userForm.get('confirmPassword')?.value && this.userForm.get('password')?.value !== '';
  }
  getPasswordMatchMessage(): string {
    if (!this.userForm.get('confirmPassword')?.touched) return '';
    return this.passwordsMatch() ? 'Пароли совпадают' : 'Пароли не совпадают';
  }

  selectPartnerType(type: PartnerType): void {
    this.selectedPartnerType = type;
    this.companyForm.patchValue({ partnerTypeId: type.id });
    this.updateKppValidation();
  }

  onFileSelected(event: Event, documentTypeId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

    if (!allowedTypes.includes(file.type)) {
      this.error = 'Разрешены только файлы PDF, JPEG, PNG и Word';
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error = 'Файл слишком большой. Максимальный размер 10MB';
      return;
    }

    const document: DocumentData = { type: documentTypeId, file, fileName: file.name, fileType: file.type, fileSize: file.size };
    const existingIndex = this.uploadedDocuments.findIndex(doc => doc.type === documentTypeId);
    if (existingIndex >= 0) this.uploadedDocuments[existingIndex] = document;
    else this.uploadedDocuments.push(document);

    this.accountData.documents = this.uploadedDocuments;
    input.value = '';
    this.error = null;
    this.showSuccessToast(`Документ загружен`);
  }

  removeDocument(documentTypeId: number): void {
    this.uploadedDocuments = this.uploadedDocuments.filter(doc => doc.type !== documentTypeId);
    this.accountData.documents = this.uploadedDocuments;
  }

  getUploadedDocument(typeId: number): DocumentData | undefined {
    return this.uploadedDocuments.find(doc => doc.type === typeId);
  }

  replaceDocument(docId: number): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = (e: any) => this.onFileSelected(e, docId);
    input.click();
  }

  isDocumentUploaded(documentTypeId: number): boolean {
    return this.uploadedDocuments.some(doc => doc.type === documentTypeId);
  }

  getUploadedRequiredDocumentsCount(): number {
    return this.uploadedDocuments.filter(doc => this.getRequiredDocuments().some((rd: any) => rd.id === doc.type)).length;
  }

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) event.preventDefault();
  }
  onDragOver(event: DragEvent): void { event.preventDefault(); this.isDragOver = true; }
  onDragLeave(event: DragEvent): void { event.preventDefault(); this.isDragOver = false; }

  onArchiveDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) this.handleArchiveFile(event.dataTransfer.files[0]);
  }

  onArchiveSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) this.handleArchiveFile(input.files[0]);
  }

  handleArchiveFile(file: File): void {
    const allowedExtensions = ['.zip', '.rar'];
    const fileName = file.name.toLowerCase();
    const isExtensionValid = allowedExtensions.some(ext => fileName.endsWith(ext));
    if (!isExtensionValid) { this.error = 'Поддерживаются только ZIP и RAR архивы'; return; }
    if (file.size > 50 * 1024 * 1024) { this.error = 'Максимальный размер архива 50 МБ'; return; }
    this.archiveFile = file;
    this.error = null;
    this.showSuccessToast('Архив успешно загружен');
  }

  removeArchive(): void {
    this.archiveFile = null;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getConfettiStyle(index: number): any {
    const colors = ['#327120', '#10b981', '#06b6d4', '#f59e0b', '#ef4444'];
    return {
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 2}s`,
      backgroundColor: colors[index % colors.length],
      transform: `rotate(${Math.random() * 360}deg)`,
      width: `${Math.random() * 10 + 5}px`,
      height: `${Math.random() * 10 + 5}px`
    };
  }

  canSubmitDocuments(): boolean {
    // Разрешаем отправку, если ИНН проверен успешно (независимо от наличия документов, т.к. они могут быть опциональны или загружены позже, но базовая валидация формы должна пройти)
    return this.innCheckResult?.success === true && this.companyForm.valid;
  }

  submitBusinessAccount(): void {
    if (!this.canSubmitDocuments()) {
      this.error = 'Пожалуйста, завершите проверку ИНН и заполните данные';
      this.scrollToTop();
      return;
    }

    if (!this.userRegistered) {
      this.error = 'Пользователь не зарегистрирован';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    if (this.companyId && this.isActiveUser) {
      this.submitDocumentsForExistingPartner();
    } else {
      this.submitCompanyAndOrder();
    }
  }

  private submitCompanyAndOrder(): void {
    const userInstanceId = this.registeredUserId;
    if (!userInstanceId) {
      this.error = 'ID пользователя не найден';
      this.isSubmitting = false;
      return;
    }

    const formCompanyFormData = this.companyForm.value;

    // ВАЖНО: Добавлен флаг isIndividual: true
    const partnerCreateDTO = {
      fullName: formCompanyFormData.fullName,
      shortName: formCompanyFormData.shortName,
      inn: formCompanyFormData.inn,
      ogrn: formCompanyFormData.ogrn,
      kpp: formCompanyFormData.kpp,
      partnerTypeCode: formCompanyFormData.partnerTypeId,
      isIndividual: true, // <-- ФЛАГ ДЛЯ ИП И САМОЗАНЯТОГО
      address: {
        country: this.accountData.company.address?.country || 'Россия',
        region: this.accountData.company.address?.region || '',
        city: this.accountData.company.address?.city || '',
        street: this.accountData.company.address?.street || '',
        house: this.accountData.company.address?.house || ''
      }
    };

    const newPartner: any = { partnerCreateDTO: partnerCreateDTO };

    this.partnerService.setPartnerUser(newPartner).pipe(
      switchMap((partnerResponse) => {
        const partnerInstance = partnerResponse.data;
        let dataRequest: CreateWholesaleOrderDto = {
          beginDateTime: null,
          endDateTime: null,
          partnerInstanceId: partnerInstance.id,
          userInstanceId: userInstanceId,
          wholesalePartnerType: 2
        }
        if (this.pkt_c1) dataRequest.productPlaceCode = this.pkt_c1;
        return this.wholesaleOrderService.createOrder(dataRequest).pipe(map((orderResponse) => ({ partnerInstance, orderId: orderResponse.data.id })));
      }),
      switchMap(({ partnerInstance, orderId }) => {
        if (this.accountData.documents?.length > 0) {
          let files: File[] = [];
          let documentTypes: number[] = [];
          if (this.uploadMethod === 'single') {
            files = this.accountData.documents.filter((doc: any) => doc.file).map((doc: any) => doc.file);
            documentTypes = this.accountData.documents.filter((doc: any) => doc.file).map((doc: any) => doc.type);
          } else if (this.uploadMethod === 'archive' && this.archiveFile) {
            files = [this.archiveFile];
            documentTypes = [99];
          }
          if (files.length > 0) {
            return this.wholesaleOrderService.addDocuments(orderId, files, documentTypes).pipe(map(() => orderId));
          }
        }
        return of(orderId);
      })
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.success = true;
        this.scrollToTop();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.error = error.message || 'Произошла ошибка при регистрации';
      }
    });
  }

  private submitDocumentsForExistingPartner(): void {
    const authToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);
    if (!authToken) {
      this.error = 'Необходимо авторизоваться';
      this.isSubmitting = false;
      return;
    }

    this.userApiService.getData().pipe(
      switchMap((userResponse) => {
        const user = userResponse.data;
        let dataRequest: CreateWholesaleOrderDto = {
          beginDateTime: null,
          endDateTime: null,
          partnerInstanceId: this.companyId,
          wholesalePartnerType: 2,
          userInstanceId: user.id,
          productPlaceCode: this.pkt_c1
        };
        if (this.pkt_c1) dataRequest.productPlaceCode = this.pkt_c1;

        return this.wholesaleOrderService.createOrder(dataRequest).pipe(map((orderResponse) => ({ user, orderId: orderResponse.data.id })));
      }),
      switchMap(({ user, orderId }) => {
        if (this.accountData.documents?.length > 0) {
          let files: File[] = [];
          let documentTypes: number[] = [];
          if (this.uploadMethod === 'single') {
            files = this.accountData.documents.filter((doc: any) => doc.file).map((doc: any) => doc.file);
            documentTypes = this.accountData.documents.filter((doc: any) => doc.file).map((doc: any) => doc.type);
          } else if (this.uploadMethod === 'archive' && this.archiveFile) {
            files = [this.archiveFile];
            documentTypes = [99];
          }
          if (files.length > 0) {
            return this.wholesaleOrderService.addDocuments(orderId, files, documentTypes).pipe(map(() => orderId));
          }
        }
        return of(orderId);
      })
    ).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.success = true;
        this.router.navigate(['/profile/companies']);
      },
      error: (error) => {
        this.isSubmitting = false;
        this.error = error.message || 'Ошибка при загрузке документов';
      }
    });
  }


  /** Сообщение для самозанятого (НПД) */
  get npdMessage(): string | null {
    return this.innCheckResult?.details?.self_employed?.message ?? null;
  }

  /** Данные партнёра для ИП */
  get partnerInfo(): PartnerInfoDto | null {
    return this.innCheckResult?.details?.partnerInfo ?? null;
  }

  /** Статус: самозанятый подтверждён */
  get isNpdConfirmed(): boolean {
    return this.innCheckResult?.success === true &&
      this.innCheckResult?.details?.self_employed?.is_self_employed === true;
  }

  /** Статус: ИП найден */
  get isIpFound(): boolean {
    return this.innCheckResult?.success === true &&
      !!this.innCheckResult?.details?.partnerInfo;
  }

  /** ИНН из результата проверки */
  get checkedInn(): string | null {
    return this.innCheckResult?.inn ?? null;
  }
}