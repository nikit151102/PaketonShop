import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, map, switchMap, takeUntil, catchError, delay, tap } from 'rxjs/operators';
import { of, Subject, timer } from 'rxjs';
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';
import { AuthService } from '../../core/services/auth.service';
import { StorageUtils } from '../../../utils/storage.utils';
import { localStorageEnvironment } from '../../../environment';
import { UserApiService } from '../../core/api/user.service';
import { UserService } from '../../core/services/user.service';
import { PartnerService } from '../../core/api/partner.service';
import { WholesaleOrderService } from '../../core/api/wholesale-order.service';
import { PartnerBankService } from '../../core/api/partner-bank.service';

interface ContractorDetails {
  id: string;
  shortName: string;
  fullName: string;
  inn: string;
  ogrn: string;
  kpp: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  korAccount?: string;
  workDirection?: string;
  phoneNumber?: string;
  email?: string;
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
  ]),
  trigger('pulse', [
    transition(':enter', [
      style({ opacity: 0, transform: 'scale(0.95)' }),
      animate('200ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
    ])
  ])
];

interface BusinessAccountData {
  user: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName: string;
    birthday: string;
    phoneNumber: string;
  };
  company: {
    id?: string;
    fullName: string;
    shortName: string;
    inn: string;
    ogrn: string;
    kpp: string;
    partnerTypeId: string;
    workDirection: string;
    registrationDate?: Date;
    address: {
      country: string;
      region: string;
      city: string;
      street: string;
      house: string;
      postIndex: string;
    };
  };
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
  address: {
    country: string;
    region: string;
    city: string;
    street: string;
    house: string;
    postIndex: string;
  };
  phoneNumber?: string;
  email?: string;
  bank?: {
    id: string;
    bik: string;
    partner: {
      shortName: string;
      fullName: string;
    };
  };
}

interface FieldError {
  field: string;
  message: string;
}

@Component({
  selector: 'app-business-account-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './business-account-registration.component.html',
  styleUrls: ['./business-account-registration.component.scss'],
  animations: animations
})
export class BusinessAccountRegistrationComponent implements OnInit, OnDestroy {
  currentStep = 1;
  totalSteps = 3;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  fieldErrors: FieldError[] = [];
  success = false;
  showHelp = false;
  showPassword = false;
  showConfirmPassword = false;
  uploadMethod: 'single' | 'cloud' | 'archive' = 'single';
  selectedProvider: 'yandex' | 'google' | 'dropbox' | 'other' = 'yandex';
  cloudLink = '';
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

  partnerTypes: PartnerType[] = [];
  selectedPartnerType: PartnerType | null = null;
  companyRegistrationDate: Date | null = null;

  innSearchValue: string = '';
  isSearchingByInn = false;
  innSearchResult: ContractorDetails | null = null;
  innSearchError: string | null = null;
  showCompanyForm = false;
  searchAttempted = false;
  searchProgress = 0;
  isPartialDataFound = false;

  documentTypes: any = [
    { id: 1, name: 'Решение о создании ООО', requiredFor: [1], optionalFor: [] },
    { id: 2, name: 'Устав (листы 1, 2, последний, полномочия директора)', requiredFor: [1], optionalFor: [] },
    { id: 3, name: 'Решение о назначении директора', requiredFor: [1], optionalFor: [] },
    { id: 5, name: 'Карточка предприятия', requiredFor: [1, 2], optionalFor: [] },
    {
      id: 6,
      name: 'Свидетельство ОГРН',
      requiredFor: [],
      optionalFor: [1],
      condition: 'before2017'
    },
    {
      id: 7,
      name: 'Свидетельство ИНН/КПП',
      requiredFor: [],
      optionalFor: [1],
      condition: 'before2017'
    },
    {
      id: 8,
      name: 'Свидетельство ОГРНИП (для регистраций до 2017 г.)',
      requiredFor: [],
      optionalFor: [2],
      condition: 'before2017'
    },
    // {
    //   id: 9,
    //   name: 'Свидетельство ИНН',
    //   requiredFor: [],
    //   optionalFor: [2],
    //   condition: 'before2027'
    // },
    // {
    //   id: 10,
    //   name: 'Лист записи ЕГРИП',
    //   requiredFor: [],
    //   optionalFor: [2],
    //   condition: 'after2017'
    // },
    { id: 9, name: 'Паспорт (разворот с фото и пропиской)', requiredFor: [1, 2], optionalFor: [] }
  ];

  uploadedDocuments: DocumentData[] = [];

  progress = {
    step1: false,
    step2: false,
    step3: false
  };

  passwordStrength = {
    level: 0,
    hints: [] as { message: string; valid: boolean }[]
  };

  private destroy$ = new Subject<void>();
  isActiveUser: boolean = false;

  stepHints: { [key: number]: { title: string; description: string; tips: string[] } } = {
    1: {
      title: 'Создание учетной записи',
      description: 'Заполните информацию о себе для создания личного кабинета',
      tips: [
        'Используйте реальные данные для быстрой верификации',
        'Пароль должен содержать минимум 8 символов',
        'Укажите актуальный email - на него придут уведомления',
        'Телефон понадобится для связи和支持'
      ]
    },
    2: {
      title: 'Информация о компании',
      description: 'Найдите или заполните данные вашей компании',
      tips: [
        'Введите ИНН для автоматического поиска компании',
        'Если компания не найдена - заполните данные вручную',
        'Все поля со звездочкой (*) обязательны для заполнения',
        'Проверьте правильность реквизитов перед отправкой'
      ]
    },
    3: {
      title: 'Загрузка документов',
      description: 'Предоставьте необходимые документы для верификации',
      tips: [
        'Загружайте документы в формате PDF, JPEG или PNG',
        'Максимальный размер одного файла - 10 МБ',
        'Вы можете загрузить архивом или по одному документу',
        'Убедитесь, что документы четкие и все данные читаемы'
      ]
    }
  };

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

      if (this.companyId) {
        const authToken = StorageUtils.getLocalStorageCache(localStorageEnvironment.auth.key);
        if (authToken) {
          this.loadUserDataAndPartner();
          this.hideFirstTwoSteps = true;
          this.currentStep = 3;
          this.userRegistered = true;
        } else {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { companyId: null },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
        }
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

      this.fieldErrors = [];

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
        if (!isNaN(date.getTime())) {
          formattedBirthday = date.toISOString();
        }
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
          StorageUtils.setLocalStorageCache(
            localStorageEnvironment.auth.key,
            token,
            localStorageEnvironment.auth.ttl,
          );

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
          console.error('Registration error:', error);
          let errorMessage = 'Ошибка при регистрации пользователя';
          if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          this.error = errorMessage;
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

            this.accountData.user = {
              ...this.userForm.value,
              birthday: formattedBirthday
            };

            this.showSuccessToast('Пользователь успешно создан!');
            resolve(true);
          } else {
            this.isRegisteringUser = false;
            reject(false);
          }
        },
        error: (error) => {
          console.error('Subscription error:', error);
          this.isRegisteringUser = false;
          reject(false);
        }
      });
    });
  }

  private updateUserFormValidators(): void {
    const passwordControl = this.userForm.get('password');
    const confirmPasswordControl = this.userForm.get('confirmPassword');

    if (this.isActiveUser) {
      // Если пользователь уже авторизован - убираем валидаторы с паролей
      passwordControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
    } else {
      // Если пользователь не авторизован - добавляем валидаторы
      passwordControl?.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
      ]);
      confirmPasswordControl?.setValidators([Validators.required]);
    }

    // Обновляем состояние валидации
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
  }

  private collectFieldErrors(): void {
    this.fieldErrors = [];
    const invalidFields: string[] = [];

    const formControls = this.userForm.controls;
    for (const controlName in formControls) {
      const control = formControls[controlName];

      // Пропускаем поля паролей, если пользователь уже авторизован
      if (this.isActiveUser && (controlName === 'password' || controlName === 'confirmPassword')) {
        continue;
      }

      if (control.invalid && control.touched) {
        let message = '';
        if (control.errors?.['required']) {
          message = this.getFieldLabel(controlName) + ' обязательно для заполнения';
          invalidFields.push(this.getFieldLabel(controlName));
        } else if (control.errors?.['email']) {
          message = 'Введите корректный email';
        } else if (control.errors?.['minlength']) {
          message = this.getFieldLabel(controlName) + ' должен содержать минимум ' + control.errors['minlength'].requiredLength + ' символов';
        } else if (control.errors?.['pattern']) {
          message = this.getFieldLabel(controlName) + ' имеет неверный формат';
        } else if (control.errors?.['mismatch']) {
          message = 'Пароли не совпадают';
        }
        this.fieldErrors.push({ field: controlName, message });
      }
    }

  }

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      email: 'Email',
      password: 'Пароль',
      confirmPassword: 'Подтверждение пароля',
      firstName: 'Имя',
      lastName: 'Фамилия',
      middleName: 'Отчество',
      phoneNumber: 'Телефон',
      birthday: 'Дата рождения',
      agreeToTerms: 'Согласие с условиями'
    };
    return labels[fieldName] || fieldName;
  }

  async nextStep(): Promise<void> {
    if (this.currentStep === 1) {
      let isValid = false;

      if (this.isActiveUser) {
        // Для авторизованного пользователя проверяем только обязательные поля
        const emailControl = this.userForm.get('email');
        const firstNameControl = this.userForm.get('firstName');
        const lastNameControl = this.userForm.get('lastName');
        const phoneNumberControl = this.userForm.get('phoneNumber');
        const agreeToTermsControl = this.userForm.get('agreeToTerms');

        isValid = !!(emailControl?.valid && firstNameControl?.valid && lastNameControl?.valid &&
          phoneNumberControl?.valid && agreeToTermsControl?.valid);

        if (!isValid) {
          this.markCurrentStepAsTouched();
          this.collectFieldErrors();
          this.error = 'Пожалуйста, заполните все обязательные поля';
          this.scrollToTop();
          return;
        }

        // Если пользователь уже авторизован, просто переходим на следующий шаг
        this.currentStep++;
        this.scrollToTop();
        this.showStepSuccessMessage('Данные проверены! Теперь укажите данные компании');
        return;
      }

      // Для неавторизованного пользователя - стандартная проверка
      if (!this.userForm.valid) {
        this.markCurrentStepAsTouched();
        this.collectFieldErrors();
        this.error = 'Пожалуйста, заполните все обязательные поля';
        this.scrollToTop();
        return;
      }

      this.isLoading = true;
      this.error = null;
      this.fieldErrors = [];

      try {
        const registered = await this.registerUserBeforeStep2();
        if (registered) {
          this.currentStep++;
          this.scrollToTop();
          this.showStepSuccessMessage('Регистрация успешна! Теперь укажите данные компании');
        }
      } catch (error) {
        console.error('Registration failed:', error);
      } finally {
        this.isLoading = false;
      }
    }
    else if (this.currentStep === 2) {
      if (!this.validateCompanyStep()) {
        this.scrollToTop();
        return;
      }

      this.saveCurrentStepData();

      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.scrollToTop();
        this.showStepSuccessMessage('Данные компании сохранены! Переходим к загрузке документов');
      }
    }
    else {
      if (!this.validateCurrentStep()) {
        this.markCurrentStepAsTouched();
        return;
      }

      this.saveCurrentStepData();

      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        this.scrollToTop();
      }
    }
  }

  private validateCompanyStep(): boolean {
    if (!this.showCompanyForm) {
      this.error = 'Пожалуйста, найдите компанию по ИНН или заполните данные вручную';
      return false;
    }

    if (!this.companyForm.valid) {
      this.companyForm.markAllAsTouched();
      this.error = 'Пожалуйста, заполните все обязательные поля формы компании';
      return false;
    }

    return true;
  }

  private showStepSuccessMessage(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'success-toast step-success';
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">✓</div>
        <div class="toast-message">${message}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
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
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            birthdayValue = `${year}-${month}-${day}`;
          }
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

        this.accountData.user = {
          ...this.userForm.value,
          birthday: formattedBirthday
        };

        this.progress.step1 = true;

        return this.partnerService.getPartnerById(this.companyId!);
      }),
      catchError(error => {
        console.error('Error loading data:', error);
        this.error = 'Ошибка при загрузке данных';
        return of(null);
      })
    ).subscribe({
      next: (partnerResponse) => {
        this.isLoadingPartner = false;
        if (partnerResponse && partnerResponse.data) {
          this.existingPartner = partnerResponse.data;
          this.selectedPartnerType = partnerResponse.data.partner?.partnerType;
          this.populateCompanyForm();
          this.progress.step2 = true;
          this.isActivePartner = true;
        } else {
          this.error = 'Компания не найдена';
        }
      },
      error: (error) => {
        this.isLoadingPartner = false;
        console.error('Error loading partner:', error);
        this.error = 'Ошибка при загрузке данных компании';
      }
    });
  }

  private populateCompanyForm(): void {
    if (!this.existingPartner) return;

    const partner = this.existingPartner;

    if (partner.partnerType) {
      this.selectedPartnerType = partner.partnerType;
      this.companyForm.patchValue({
        partnerTypeId: partner.partnerType.id
      });
    }

    this.companyForm.patchValue({
      fullName: partner.fullName || '',
      shortName: partner.shortName || '',
      workDirection: partner.workDirection || '',
      inn: partner.inn || '',
      ogrn: partner.ogrn || '',
      kpp: partner.kpp || ''
    });

    if (partner.address) {
      this.companyForm.patchValue({
        address: {
          country: partner.address.country || 'Россия',
          region: partner.address.region || '',
          city: partner.address.city || '',
          street: partner.address.street || '',
          house: partner.address.house || '',
          postIndex: partner.address.postIndex || ''
        }
      });
    }

    this.accountData.company = {
      id: partner.id,
      fullName: partner.fullName,
      shortName: partner.shortName,
      inn: partner.inn,
      ogrn: partner.ogrn,
      kpp: partner.kpp || '',
      partnerTypeId: partner.partnerType?.id || '',
      workDirection: partner.workDirection || '',
      address: partner.address ? {
        country: partner.address.country || 'Россия',
        region: partner.address.region || '',
        city: partner.address.city || '',
        street: partner.address.street || '',
        house: partner.address.house || '',
        postIndex: partner.address.postIndex || ''
      } : {
        country: 'Россия',
        region: '',
        city: '',
        street: '',
        house: '',
        postIndex: ''
      }
    };

    this.updateKppValidation();
  }

  searchByInn(): void {
    const inn = this.innSearchValue?.trim();

    if (!inn || inn.length === 0) {
      this.innSearchError = 'Введите ИНН для поиска';
      this.searchAttempted = true;
      this.isPartialDataFound = false;
      return;
    }

    const isValidInn = /^\d{10}$|^\d{12}$/.test(inn);
    if (!isValidInn) {
      this.innSearchError = 'ИНН должен содержать 10 или 12 цифр';
      this.searchAttempted = true;
      this.isPartialDataFound = false;
      return;
    }

    this.isSearchingByInn = true;
    this.innSearchError = null;
    this.innSearchResult = null;
    this.isPartialDataFound = false;
    this.searchProgress = 0;
    this.showCompanyForm = false;

    const progressInterval = setInterval(() => {
      if (this.searchProgress < 90) {
        this.searchProgress += 10;
      }
    }, 100);

    this.partnerService.getPartnerByInn(inn).pipe(
      delay(500),
      catchError(error => {
        clearInterval(progressInterval);
        this.searchProgress = 100;
        setTimeout(() => { this.searchProgress = 0; }, 500);

        if (error.status === 404) {
          this.innSearchError = 'Компания с таким ИНН не найдена в нашей базе';
          this.isPartialDataFound = true;
        } else {
          this.innSearchError = 'Ошибка при поиске. Попробуйте позже';
        }
        return of(null);
      }),
      finalize(() => {
        clearInterval(progressInterval);
        setTimeout(() => {
          this.isSearchingByInn = false;
          this.searchProgress = 0;
        }, 500);
      })
    ).subscribe(result => {
      if (result && result.data) {
        const contractorData = result.data;

        // Проверяем, найдена ли компания
        const hasRequiredData = contractorData.fullName &&
          contractorData.inn &&
          contractorData.ogrn &&
          contractorData.fullName !== '' &&
          contractorData.inn !== '' &&
          contractorData.ogrn !== '';

        // Проверяем, является ли компания найденной (есть ID или полные данные)
        const isCompanyFound = contractorData.id !== null || hasRequiredData;

        if (!isCompanyFound || !hasRequiredData) {
          // Это не найденная компания - пустой объект с только ИНН
          this.innSearchError = 'Компания с таким ИНН не найдена в нашей базе. Пожалуйста, заполните данные вручную';
          this.isPartialDataFound = true;
          this.innSearchResult = null;
        } else {
          // Компания найдена
          this.innSearchResult = contractorData;
          this.innSearchError = null;
          this.showSuccessToast('Компания найдена!');
        }
        this.searchAttempted = true;
      }
    });
  }


  fillFormWithContractorData(contractor: ContractorDetails): void {
    console.log('Filling form with contractor data:', contractor);

    // Устанавливаем тип партнера на основе ОГРН или если есть partnerType
    let partnerTypeId = '';
    if (contractor.partnerType && contractor.partnerType.id) {
      partnerTypeId = contractor.partnerType.id;
    } else if (contractor.ogrn) {
      // Если ОГРН 13 цифр - это ООО, если 15 - ИП
      partnerTypeId = contractor.ogrn.length === 13 ? '1' : '2';
    }

    if (partnerTypeId) {
      this.selectedPartnerType = this.partnerTypes.find(t => t.id === partnerTypeId) || null;
      this.companyForm.patchValue({
        partnerTypeId: partnerTypeId
      });
      this.updateKppValidation();
    }

    // Заполняем форму данными из найденной компании
    this.companyForm.patchValue({
      fullName: contractor.fullName || '',
      shortName: contractor.shortName || contractor.fullName?.split('"')[1] || '',
      inn: contractor.inn || '',
      ogrn: contractor.ogrn || '',
      kpp: contractor.kpp || '',
      workDirection: contractor.workDirection || ''
    });

    // Заполняем адрес
    if (contractor.address) {
      this.addressForm.patchValue({
        country: 'Россия',
        region: contractor.address.region || '',
        city: contractor.address.city || '',
        street: contractor.address.street || '',
        house: contractor.address.house || '',
        postIndex: contractor.address.postIndex || ''
      });
    }

    // Заполняем данные пользователя, если есть
    // if (contractor.lastName || contractor.firstName) {
    //   this.userForm.patchValue({
    //     lastName: contractor.lastName || this.userForm.get('lastName')?.value,
    //     firstName: contractor.firstName || this.userForm.get('firstName')?.value,
    //     middleName: contractor.middleName || this.userForm.get('middleName')?.value,
    //     phoneNumber: contractor.phoneNumber || this.userForm.get('phoneNumber')?.value,
    //     email: contractor.email || this.userForm.get('email')?.value
    //   });
    // }

    this.showCompanyForm = true;
    this.progress.step2 = true;

    this.saveCurrentStepData();

    this.showSuccessToast('Данные компании успешно загружены!');
  }

  get addressForm(): FormGroup {
    return this.companyForm.get('address') as FormGroup;
  }


  showManualFormFields(): void {
    this.showCompanyForm = true;
    this.innSearchError = null;
    this.innSearchResult = null;
    this.searchAttempted = true;
    this.isPartialDataFound = false;

    if (!this.selectedPartnerType && this.partnerTypes.length > 0) {
      this.selectedPartnerType = this.partnerTypes[0];
      this.companyForm.patchValue({ partnerTypeId: this.partnerTypes[0].id });
    }

    this.showSuccessToast('Заполните данные компании вручную');
  }

  useFoundCompany(): void {
    if (this.innSearchResult) {
      this.fillFormWithContractorData(this.innSearchResult);
    }
  }


  resetInnSearch(): void {
    this.innSearchValue = '';
    this.innSearchResult = null;
    this.innSearchError = null;
    this.showCompanyForm = false;
    this.searchAttempted = false;
    this.isSearchingByInn = false;
    this.searchProgress = 0;
    this.isPartialDataFound = false;
  }

  updateInnSearch(): void {
    if (this.searchAttempted) {
      this.resetInnSearch();
    }
  }

  showSuccessToast(message: string): void {
    const toast = document.createElement('div');
    toast.className = 'success-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">✓</div>
        <div class="toast-message">${message}</div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }


  private loadUserData(): void {
    this.userApiService.getData().pipe(
      catchError(error => {
        console.error('Error loading user data:', error);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (response && response.data) {
          const user = response.data;
          this.isActiveUser = true;
          this.userRegistered = true;
          this.registeredUserId = user.id;

          let birthdayValue = null;
          if (user.birthday) {
            const date = new Date(user.birthday);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            birthdayValue = `${year}-${month}-${day}`;
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

          if (!this.companyId) {
            this.currentStep = 2;
          }
        }
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this.isLoading = false;
      }
    });
  }

  private createUserForm(): FormGroup {
    return this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
      ]],
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
      workDirection: ['', Validators.required],
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
    if (cleanValue.length === 10 || cleanValue.length === 12) {
      return null;
    }
    return { invalidInn: true };
  }

  private passwordMatchValidator(g: FormGroup): ValidationErrors | null {
    const password = g.get('password')?.value;
    const confirmPassword = g.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { mismatch: true };
  }

  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const cleanValue = value.replace(/\D/g, '');
    return cleanValue.length >= 10 ? null : { invalidPhone: true };
  }

  private kppValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value;
    if (!value) return null;
    const regex = /^\d{9}$/;
    return regex.test(value) ? null : { invalidKpp: true };
  }

  private loadPartnerTypes(): void {
    this.isLoading = true;
    setTimeout(() => {
      this.partnerTypes = [
        { id: '1', code: 1, fullName: 'Общество с ограниченной ответственностью', shortName: 'ООО' },
        { id: '2', code: 2, fullName: 'Индивидуальный предприниматель', shortName: 'ИП' }
      ];
      this.isLoading = false;
    }, 500);
  }

  private setupFormListeners(): void {
    this.companyForm.get('partnerTypeId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        const type = this.partnerTypes.find(t => t.id === value);
        this.selectedPartnerType = type || null;
        this.updateKppValidation();
      });

    this.userForm.get('password')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(password => {
        this.updatePasswordStrength(password);
      });

    this.companyForm.get('registrationDate')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(date => {
        this.companyRegistrationDate = date ? new Date(date) : null;
      });
  }

  private updateKppValidation(): void {
    const kppControl = this.companyForm.get('kpp');
    if (this.selectedPartnerType?.code === 1) {
      kppControl?.setValidators([Validators.required, this.kppValidator]);
    } else {
      kppControl?.clearValidators();
      kppControl?.setValidators(this.kppValidator);
    }
    kppControl?.updateValueAndValidity();
  }

  private checkDocumentCondition(document: any): boolean {
    if (!document.condition || !this.companyRegistrationDate) {
      return false;
    }
    const registrationYear = this.companyRegistrationDate.getFullYear();
    switch (document.condition) {
      case 'before2017': return registrationYear < 2017;
      case 'after2017': return registrationYear >= 2017;
      case 'before2027': return registrationYear < 2027;
      default: return true;
    }
  }

  todayDate(): string {
    return new Date().toISOString().split('T')[0];
  }

  getRequiredDocuments(): any[] {
    if (!this.selectedPartnerType) return [];
    return this.documentTypes.filter((doc: any) => {
      const isForPartnerType = doc.requiredFor.includes(this.selectedPartnerType!.code);
      if (!isForPartnerType) return false;
      if (!this.companyRegistrationDate && doc.condition) return false;
      if (doc.condition && this.companyRegistrationDate) return this.checkDocumentCondition(doc);
      return true;
    });
  }

  getOptionalDocuments(): any[] {
    if (!this.selectedPartnerType) return [];
    return this.documentTypes.filter((doc: any) => {
      const isForPartnerType = doc.optionalFor.includes(this.selectedPartnerType!.code);
      if (!isForPartnerType) return false;
      if (doc.condition) return this.checkDocumentCondition(doc);
      return true;
    });
  }

  getProgressPercentage(): number {
    let progress = 0;
    if (this.progress.step1) progress += 33;
    if (this.progress.step2) progress += 33;
    if (this.progress.step3) progress += 34;
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

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        if (this.isActiveUser) {
          const emailControl = this.userForm.get('email');
          const firstNameControl = this.userForm.get('firstName');
          const lastNameControl = this.userForm.get('lastName');
          const phoneNumberControl = this.userForm.get('phoneNumber');
          const agreeToTermsControl = this.userForm.get('agreeToTerms');

          return !!(emailControl?.valid && firstNameControl?.valid && lastNameControl?.valid &&
            phoneNumberControl?.valid && agreeToTermsControl?.valid);
        }
        return this.userForm.valid;
      case 2:
        return this.showCompanyForm && this.companyForm.valid;
      case 3:
        return this.validateDocumentsStep();
      default:
        return true;
    }
  }

  validateDocumentsStep(): boolean {
    if (!this.selectedPartnerType) return false;
    if (this.uploadMethod === 'single') {
      const requiredDocs = this.getRequiredDocuments();
      return requiredDocs.every(requiredDoc =>
        this.uploadedDocuments.some(doc => doc.type === requiredDoc.id)
      );
    } else if (this.uploadMethod === 'cloud') {
      return !!this.cloudLink && this.cloudLink.startsWith('http');
    } else if (this.uploadMethod === 'archive') {
      return !!this.archiveFile;
    }
    return false;
  }

  private markCurrentStepAsTouched(): void {
    switch (this.currentStep) {
      case 1:
        if (this.isActiveUser) {
          this.userForm.get('email')?.markAsTouched();
          this.userForm.get('firstName')?.markAsTouched();
          this.userForm.get('lastName')?.markAsTouched();
          this.userForm.get('phoneNumber')?.markAsTouched();
          this.userForm.get('agreeToTerms')?.markAsTouched();
        } else {
          Object.values(this.userForm.controls).forEach(control => control.markAsTouched());
        }
        break;
      case 2:
        if (this.showCompanyForm) {
          this.companyForm.markAllAsTouched();
        }
        break;
    }
  }


  private saveCurrentStepData(): void {
    switch (this.currentStep) {
      case 2:
        if (this.showCompanyForm) {
          const formData = this.companyForm.value;
          this.accountData.company = {
            ...formData,
            registrationDate: this.companyRegistrationDate
          };
          this.progress.step2 = true;
        }
        break;
      case 3:
        this.progress.step3 = true;
        break;
    }
  }

  getCurrentStepDescription(): any {
    const descriptions: any = {
      1: 'Расскажите о себе и своем бизнесе',
      2: 'Выберите оптимальные условия сотрудничества',
      3: 'Подтвердите данные и получите доступ'
    };
    return descriptions[this.currentStep] || '';
  }

  getCurrentStepTitle(): string {
    switch (this.currentStep) {
      case 1: return 'Создание пользователя';
      case 2: return 'Информация о компании';
      case 3: return 'Загрузка документов';
      default: return '';
    }
  }

  getStepTitle(step: number): string {
    if (this.hideFirstTwoSteps && step < 3) return '';
    switch (step) {
      case 1: return 'Пользователь';
      case 2: return 'Компания';
      case 3: return 'Документы';
      default: return `Шаг ${step}`;
    }
  }

  getStepSubtitle(step: number): string {
    if (this.hideFirstTwoSteps && step < 3) return '';
    switch (step) {
      case 1: return 'Контактные данные';
      case 2: return 'Реквизиты организации';
      case 3: return 'Верификация';
      default: return '';
    }
  }

  getStepStatus(step: number): string {
    if (this.hideFirstTwoSteps && step < 3) return 'completed';
    if (this.currentStep === step) return 'active';
    if (step === 1 && this.progress.step1) return 'completed';
    if (step === 2 && this.progress.step2) return 'completed';
    if (step === 3 && this.progress.step3) return 'completed';
    return 'pending';
  }

  getStepGuideText(): string {
    if (this.hideFirstTwoSteps && this.currentStep === 3) {
      return 'Загрузите необходимые документы для завершения регистрации';
    }
    switch (this.currentStep) {
      case 1: return 'Заполните все поля для создания учетной записи';
      case 2: return 'Найдите компанию по ИНН или заполните данные вручную';
      case 3: return 'Загрузите необходимые документы одним из способов';
      default: return '';
    }
  }

  getStepHint(): string {
    if (this.hideFirstTwoSteps && this.currentStep === 3) {
      return 'Данные компании уже предзаполнены. Осталось загрузить документы.';
    }
    switch (this.currentStep) {
      case 1: return 'Используйте надежный пароль с буквами, цифрами и символами';
      case 2: return 'Введите ИНН организации для автоматического заполнения данных';
      case 3: return 'Рекомендуем загружать документы поштучно для лучшего контроля';
      default: return '';
    }
  }

  getCurrentStepHelp(): string {
    if (this.hideFirstTwoSteps && this.currentStep === 3) {
      return 'Данные компании уже загружены. Вам нужно только загрузить документы для завершения регистрации.';
    }
    switch (this.currentStep) {
      case 1: return 'Заполните точные контактные данные. Это важно для восстановления доступа и получения уведомлений.';
      case 2: return 'Введите ИНН вашей компании. Система автоматически найдет данные в официальных источниках. Если компания не найдена, вы сможете заполнить данные вручную.';
      case 3: return 'Выберите удобный способ загрузки документов. Поштучная загрузка позволяет контролировать каждый файл.';
      default: return '';
    }
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
    const password = this.userForm.get('password')?.value;
    this.updatePasswordStrength(password);
  }

  updatePasswordStrength(password: string): void {
    this.passwordStrength.hints = [];
    if (!password) {
      this.passwordStrength.level = 0;
      return;
    }
    let level = 0;
    if (password.length >= 8) {
      level++;
      this.passwordStrength.hints.push({ message: 'Не менее 8 символов', valid: true });
    } else {
      this.passwordStrength.hints.push({ message: 'Не менее 8 символов', valid: false });
    }
    if (/[A-Za-z]/.test(password)) {
      level++;
      this.passwordStrength.hints.push({ message: 'Содержит буквы', valid: true });
    } else {
      this.passwordStrength.hints.push({ message: 'Содержит буквы', valid: false });
    }
    if (/\d/.test(password)) {
      level++;
      this.passwordStrength.hints.push({ message: 'Содержит цифры', valid: true });
    } else {
      this.passwordStrength.hints.push({ message: 'Содержит цифры', valid: false });
    }
    if (/[^A-Za-z0-9]/.test(password)) {
      level++;
      this.passwordStrength.hints.push({ message: 'Содержит спецсимволы', valid: true });
    } else {
      this.passwordStrength.hints.push({ message: 'Содержит спецсимволы', valid: false });
    }
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
      level++;
      this.passwordStrength.hints.push({ message: 'Смешанный регистр', valid: true });
    } else {
      this.passwordStrength.hints.push({ message: 'Смешанный регистр', valid: false });
    }
    this.passwordStrength.level = level;
  }

  getPasswordStrengthLevel(): number {
    return Math.min(this.passwordStrength.level, 5);
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  passwordsMatch(): boolean {
    const password = this.userForm.get('password')?.value;
    const confirm = this.userForm.get('confirmPassword')?.value;
    return password === confirm && password !== '';
  }

  getPasswordMatchMessage(): string {
    if (!this.userForm.get('confirmPassword')?.touched) return '';
    if (this.passwordsMatch()) return 'Пароли совпадают';
    return 'Пароли не совпадают';
  }

  selectPartnerType(type: PartnerType): void {
    this.selectedPartnerType = type;
    this.companyForm.patchValue({ partnerTypeId: type.id });
    this.updateKppValidation();

    if (this.companyForm.valid) {
      this.progress.step2 = true;
    }
  }

  isCompanyFullyFound() {
    return this.innSearchResult !== null &&
      this.innSearchResult.fullName &&
      this.innSearchResult.fullName !== '' &&
      this.innSearchResult.inn &&
      this.innSearchResult.inn !== '';
  }


  getFullNamePlaceholder(): string {
    if (this.selectedPartnerType?.code === 1) {
      return 'Общество с ограниченной ответственностью "Ромашка"';
    }
    return 'Индивидуальный предприниматель Иванов Иван Иванович';
  }

  getShortNamePlaceholder(): string {
    if (this.selectedPartnerType?.code === 1) {
      return 'ООО "Ромашка"';
    }
    return 'ИП Иванов И.И.';
  }

  getOgrnPlaceholder(): string {
    if (this.selectedPartnerType?.code === 1) {
      return '13 цифр';
    }
    return '15 цифр';
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

    const document: DocumentData = {
      type: documentTypeId,
      file: file,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    };

    const existingIndex = this.uploadedDocuments.findIndex(doc => doc.type === documentTypeId);
    if (existingIndex >= 0) {
      this.uploadedDocuments[existingIndex] = document;
    } else {
      this.uploadedDocuments.push(document);
    }

    this.accountData.documents = this.uploadedDocuments;
    input.value = '';
    this.error = null;
    this.showSuccessToast(`Документ "${this.getDocumentName(documentTypeId)}" загружен`);
  }

  removeDocument(documentTypeId: number): void {
    const docName = this.getDocumentName(documentTypeId);
    this.uploadedDocuments = this.uploadedDocuments.filter(doc => doc.type !== documentTypeId);
    this.accountData.documents = this.uploadedDocuments;
    this.showSuccessToast(`Документ "${docName}" удален`);
  }

  getDocumentName(typeId: number): string {
    const docType = this.documentTypes.find((doc: any) => doc.id === typeId);
    return docType?.name || `Документ ${typeId}`;
  }

  getUploadedDocument(typeId: number): DocumentData | undefined {
    return this.uploadedDocuments.find(doc => doc.type === typeId);
  }

  toggleDocumentUpload(docId: number, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    if (!checkbox.checked) {
      this.removeDocument(docId);
    }
  }

  viewDocument(docId: number): void {
    const doc = this.getUploadedDocument(docId);
    if (doc) {
      const url = URL.createObjectURL(doc.file);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  replaceDocument(docId: number): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
    input.onchange = (e: any) => this.onFileSelected(e, docId);
    input.click();
  }

  getFileType(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('image')) return 'Изображение';
    if (mimeType.includes('word')) return 'Word';
    return 'Документ';
  }

  isDocumentUploaded(documentTypeId: number): boolean {
    return this.uploadedDocuments.some(doc => doc.type === documentTypeId);
  }

  getUploadedRequiredDocumentsCount(): number {
    return this.uploadedDocuments.filter(doc =>
      this.getRequiredDocuments().some(rd => rd.id === doc.type)
    ).length;
  }

  getUploadedOptionalDocumentsCount(): number {
    return this.uploadedDocuments.filter(doc =>
      this.getOptionalDocuments().some(od => od.id === doc.type)
    ).length;
  }

  validateCloudLink(): void {
    if (!this.cloudLink) {
      this.error = 'Введите ссылку на облачное хранилище';
      return;
    }
    if (!this.cloudLink.startsWith('http')) {
      this.error = 'Ссылка должна начинаться с http:// или https://';
      return;
    }
    this.error = null;
    this.showSuccessToast('Ссылка проверена и действительна');
  }

  @HostListener('window:dragover', ['$event'])
  onWindowDragOver(event: DragEvent): void {
    if (event.dataTransfer?.types.includes('Files')) {
      event.preventDefault();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  onArchiveDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleArchiveFile(files[0]);
    }
  }

  onArchiveSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleArchiveFile(input.files[0]);
    }
  }

  handleArchiveFile(file: File): void {
    const allowedTypes = ['application/zip', 'application/x-rar-compressed'];
    const allowedExtensions = ['.zip', '.rar'];
    const fileName = file.name.toLowerCase();
    const isTypeValid = allowedTypes.includes(file.type);
    const isExtensionValid = allowedExtensions.some(ext => fileName.endsWith(ext));

    if (!isTypeValid && !isExtensionValid) {
      this.error = 'Поддерживаются только ZIP и RAR архивы';
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      this.error = 'Максимальный размер архива 50 МБ';
      return;
    }
    this.archiveFile = file;
    this.error = null;
    this.showSuccessToast('Архив успешно загружен');
  }

  removeArchive(): void {
    this.archiveFile = null;
    this.showSuccessToast('Архив удален');
  }

  getArchiveFiles(): any[] {
    return this.archiveFile ? [
      { name: 'document1.pdf', size: 1024 * 1024 },
      { name: 'document2.jpg', size: 512 * 1024 },
      { name: 'document3.docx', size: 2048 * 1024 }
    ] : [];
  }

  getArchiveFilesCount(): number {
    return this.getArchiveFiles().length;
  }

  getTotalUploadSize(): number {
    return this.uploadedDocuments.reduce((sum, doc) => sum + doc.fileSize, 0);
  }

  downloadChecklist(): void {
    const checklist = this.getRequiredDocuments().map(doc => ({
      name: doc.name,
      status: this.isDocumentUploaded(doc.id) ? '✓ Загружено' : '✗ Не загружено'
    }));
    const content = `Список документов для ${this.selectedPartnerType?.shortName}\n\n` +
      checklist.map(item => `${item.status} - ${item.name}`).join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checklist-${this.selectedPartnerType?.shortName}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    this.showSuccessToast('Чек-лист скачан');
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

  createAnother(): void {
    this.success = false;
    this.resetAllForms();
  }

  getConfettiStyle(index: number): any {
    const colors = ['#327120', '#10b981', '#06b6d4', '#f59e0b', '#ef4444'];
    const color = colors[index % colors.length];
    return {
      left: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 2}s`,
      backgroundColor: color,
      transform: `rotate(${Math.random() * 360}deg)`,
      width: `${Math.random() * 10 + 5}px`,
      height: `${Math.random() * 10 + 5}px`
    };
  }

  getUploadedRequiredPercentage(): number {
    const requiredDocsCount = this.getRequiredDocuments().length;
    if (requiredDocsCount === 0) return 0;
    const uploadedCount = this.getUploadedRequiredDocumentsCount();
    return Math.round((uploadedCount / requiredDocsCount) * 100);
  }

  submitBusinessAccount(): void {
    if (!this.validateDocumentsStep()) {
      this.error = 'Пожалуйста, завершите загрузку документов';
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
    const partnerCreateDTO = {
      fullName: formCompanyFormData.fullName,
      shortName: formCompanyFormData.shortName,
      inn: formCompanyFormData.inn,
      ogrn: formCompanyFormData.ogrn,
      kpp: formCompanyFormData.kpp,
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
        return this.wholesaleOrderService.createOrder({
          beginDateTime: null,
          endDateTime: null,
          partnerInstanceId: partnerInstance.id,
          userInstanceId: userInstanceId
        }).pipe(map((orderResponse) => ({
          partnerInstance,
          orderId: orderResponse.data.id
        })));
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
            return this.wholesaleOrderService.addDocuments(orderId, files, documentTypes).pipe(
              map(() => orderId)
            );
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
        console.error('Error during registration:', error);
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
        return this.wholesaleOrderService.createOrder({
          beginDateTime: null,
          endDateTime: null,
          partnerInstanceId: this.companyId,
          userInstanceId: user.id
        }).pipe(map((orderResponse) => ({ user, orderId: orderResponse.data.id })));
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
        console.error('Error uploading documents:', error);
      }
    });
  }

  private resetAllForms(): void {
    this.userForm.reset();
    this.companyForm.reset();
    this.uploadedDocuments = [];
    this.currentStep = 1;
    this.progress = { step1: false, step2: false, step3: false };
    this.success = false;
    this.selectedPartnerType = null;
    this.companyRegistrationDate = null;
    this.accountData = { user: {} as any, company: {} as any, documents: [] };
    this.cloudLink = '';
    this.archiveFile = null;
    this.uploadMethod = 'single';
    this.passwordStrength = { level: 0, hints: [] };
    this.hideFirstTwoSteps = false;
    this.companyId = '';
    this.existingPartner = null;
    this.innSearchValue = '';
    this.innSearchResult = null;
    this.innSearchError = null;
    this.showCompanyForm = false;
    this.searchAttempted = false;
    this.userRegistered = false;
    this.registeredUserId = null;
    this.registeredUserToken = null;
    this.fieldErrors = [];
  }

  canSubmitDocuments(): boolean {
    return this.validateDocumentsStep();
  }

  isExistingPartnerMode(): boolean {
    return !!this.companyId && this.isActiveUser;
  }

  getCurrentStepHints(): { title: string; description: string; tips: string[] } {
    return this.stepHints[this.currentStep] || this.stepHints[1];
  }

  clearFieldError(fieldName: string): void {
    this.fieldErrors = this.fieldErrors.filter(err => err.field !== fieldName);
  }
}