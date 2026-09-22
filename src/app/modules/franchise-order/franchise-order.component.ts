import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ReactiveFormsModule,
  FormsModule,
  FormGroup,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';

import {
  Subject,
  takeUntil,
  catchError,
  of,
  switchMap,
  map,
  finalize
} from 'rxjs';

import { HttpClient, HttpHeaders } from '@angular/common/http';

import { environment, localStorageEnvironment } from '../../../environment';
import { StorageUtils } from '../../../utils/storage.utils';

import { PartnerService } from '../../core/api/partner.service';
import { UserApiService } from '../../core/api/user.service';

import { AuthService } from '../../core/services/auth.service';
import { UserService } from '../../core/services/user.service';

import {
  ContractorDetails,
  FieldError
} from '../../core/interfaces/business-account-registration.interface';
import { OfficeTypesService } from '../../core/api/office-types.service';
import { InvestmentTypesService } from '../../core/api/investment-types.service';


interface InvestmentType {
  id: string;
  code: number;
  fullName: string;
  shortName: string;
  isDeleted?: boolean;
  isUse?: boolean;
}

interface OfficeType {
  id: string;
  code: number;
  fullName: string;
  shortName: string;
  isDeleted?: boolean;
  isUse?: boolean;
}


interface FranchiseOrderDto {
  city: string;
  rejectionReason: string;
  orderDateTime?: string;
  partnerInstanceId?: string | null;
  userInstanceId?: string;
  investmentTypeId: string;
  officeTypeId: string;
}


@Component({
  selector: 'app-franchise-order',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './franchise-order.component.html',
  styleUrl: './franchise-order.component.scss'
})
export class FranchiseOrderComponent implements OnInit, OnDestroy {

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

  private destroy$ = new Subject<void>();

  // ============================================================
  // USER
  // ============================================================

  userForm: FormGroup;

  isActiveUser = false;
  isRegisteringUser = false;
  userRegistered = false;

  registeredUserId: string | null = null;
  registeredUserToken: string | null = null;


  // ============================================================
  // COMPANY
  // ============================================================

  companyForm: FormGroup;

  companyId: string | null = null;

  existingPartner: any | null = null;

  isLoadingPartner = false;

  innSearchValue = '';

  isSearchingByInn = false;

  innSearchResult: ContractorDetails | null = null;

  innSearchError: string | null = null;

  searchAttempted = false;

  /**
   * true  - компания существует
   * false - компании нет
   * null  - ещё не определено
   */
  hasCompany: boolean | null = null;

  showCompanyForm = false;


  // ============================================================
  // FRANCHISE
  // ============================================================

  franchiseForm: FormGroup;

  investmentTypes: InvestmentType[] = [];

  officeTypes: OfficeType[] = [];

  isLoadingInvestmentTypes = false;

  isLoadingOfficeTypes = false;

  selectedInvestmentType: InvestmentType | null = null;

  selectedOfficeType: OfficeType | null = null;


  // ============================================================
  // PROGRESS
  // ============================================================

  progress = {
    step1: false,
    step2: false,
    step3: false
  };


  // ============================================================
  // PASSWORD
  // ============================================================

  passwordStrength = {
    level: 0,
    hints: [] as {
      message: string;
      valid: boolean;
    }[]
  };


  // ============================================================
  // API
  // ============================================================

  constructor(
    private fb: FormBuilder,

    private userApiService: UserApiService,

    private userService: UserService,

    private authService: AuthService,

    private partnerService: PartnerService,

    private http: HttpClient,

    public router: Router,

    private route: ActivatedRoute,
    private officeTypesService: OfficeTypesService,
    private investmentTypesService:InvestmentTypesService
  ) {

    this.userForm = this.createUserForm();

    this.companyForm = this.createCompanyForm();

    this.franchiseForm = this.createFranchiseForm();
  }


  // ============================================================
  // INIT
  // ============================================================

  ngOnInit(): void {

    this.setupFormListeners();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {

        this.companyId = params['companyId'] || null;

        const inn = params['inn'] || null;

        if (this.companyId) {

          const authToken =
            StorageUtils.getLocalStorageCache(
              localStorageEnvironment.auth.key
            );

          if (authToken) {

            this.loadUserDataAndPartner();

          } else {

            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: {
                companyId: null
              },
              queryParamsHandling: 'merge',
              replaceUrl: true
            });

          }

          return;
        }


        if (inn) {

          this.innSearchValue = inn;

          this.checkIfUserAuthenticatedForInn(inn);

          return;
        }


        this.checkIfUserAuthenticated();
      });


    // Предварительно загружаем данные третьего шага.
    this.loadInvestmentTypes();

    this.loadOfficeTypes();
  }


  ngOnDestroy(): void {

    this.destroy$.next();

    this.destroy$.complete();
  }


  // ============================================================
  // USER FORM
  // ============================================================

  private createUserForm(): FormGroup {

    return this.fb.group({

      email: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(
            /^(?=.*[A-Za-z])(?=.*\d).+$/
          )
        ]
      ],

      confirmPassword: [
        '',
        Validators.required
      ],

      firstName: [
        '',
        Validators.required
      ],

      lastName: [
        '',
        Validators.required
      ],

      middleName: [
        ''
      ],

      birthday: [
        ''
      ],

      phoneNumber: [
        '',
        [
          Validators.required,
          this.phoneValidator
        ]
      ],

      agreeToTerms: [
        false,
        Validators.requiredTrue
      ]

    }, {
      validators: this.passwordMatchValidator
    });
  }


  private passwordMatchValidator(
    group: FormGroup
  ): ValidationErrors | null {

    const password =
      group.get('password')?.value;

    const confirmPassword =
      group.get('confirmPassword')?.value;

    if (!password && !confirmPassword) {
      return null;
    }

    return password === confirmPassword
      ? null
      : {
        mismatch: true
      };
  }


  private phoneValidator(
    control: AbstractControl
  ): ValidationErrors | null {

    const value = control.value;

    if (!value) {
      return null;
    }

    const cleanValue =
      String(value).replace(/\D/g, '');

    return cleanValue.length >= 10
      ? null
      : {
        invalidPhone: true
      };
  }


  private updateUserFormValidators(): void {

    const passwordControl =
      this.userForm.get('password');

    const confirmPasswordControl =
      this.userForm.get('confirmPassword');


    if (this.isActiveUser) {

      passwordControl?.clearValidators();

      confirmPasswordControl?.clearValidators();

    } else {

      passwordControl?.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(
          /^(?=.*[A-Za-z])(?=.*\d).+$/
        )
      ]);

      confirmPasswordControl?.setValidators(
        Validators.required
      );
    }


    passwordControl?.updateValueAndValidity();

    confirmPasswordControl?.updateValueAndValidity();
  }


  // ============================================================
  // COMPANY FORM
  // ============================================================

  private createCompanyForm(): FormGroup {

    return this.fb.group({

      fullName: [
        '',
        [
          Validators.required,
          Validators.maxLength(200)
        ]
      ],

      shortName: [
        '',
        [
          Validators.required,
          Validators.maxLength(50)
        ]
      ],

      partnerTypeId: [
        '',
        Validators.required
      ],

      workDirection: [
        '',
        Validators.required
      ],

      inn: [
        '',
        Validators.required
      ],

      ogrn: [
        '',
        Validators.required
      ],

      kpp: [
        ''
      ],

      registrationDate: [
        ''
      ],

      address: this.fb.group({

        country: [
          'Россия',
          Validators.required
        ],

        region: [
          '',
          Validators.required
        ],

        city: [
          '',
          Validators.required
        ],

        street: [
          '',
          Validators.required
        ],

        house: [
          '',
          Validators.required
        ],

        postIndex: [
          ''
        ]

      })

    });
  }


  // ============================================================
  // FRANCHISE FORM
  // ============================================================

  private createFranchiseForm(): FormGroup {

    return this.fb.group({

      investmentTypeId: [
        '',
        Validators.required
      ],

      officeTypeId: [
        '',
        Validators.required
      ],

      city: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(100)
        ]
      ]

    });
  }


  // ============================================================
  // FORM LISTENERS
  // ============================================================

  private setupFormListeners(): void {

    this.userForm
      .get('password')
      ?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(password => {

        this.updatePasswordStrength(password);
      });


    this.franchiseForm
      .get('investmentTypeId')
      ?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {

        this.selectedInvestmentType =
          this.investmentTypes.find(
            item => item.id === id
          ) || null;
      });


    this.franchiseForm
      .get('officeTypeId')
      ?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(id => {

        this.selectedOfficeType =
          this.officeTypes.find(
            item => item.id === id
          ) || null;
      });
  }


  // ============================================================
  // AUTH CHECK
  // ============================================================

  private checkIfUserAuthenticated(): void {

    const authToken =
      StorageUtils.getLocalStorageCache(
        localStorageEnvironment.auth.key
      );

    if (authToken) {

      this.loadUserData();

    }
  }


  private checkIfUserAuthenticatedForInn(
    inn: string
  ): void {

    const authToken =
      StorageUtils.getLocalStorageCache(
        localStorageEnvironment.auth.key
      );


    if (authToken) {

      this.userApiService
        .getData()
        .pipe(takeUntil(this.destroy$))
        .subscribe({

          next: response => {

            if (!response?.data) {
              return;
            }

            const user = response.data;

            this.setUserData(user);

            this.progress.step1 = true;

            this.searchPartnerByInn(inn);
          },

          error: () => {

            this.currentStep = 1;
          }

        });

      return;
    }


    this.currentStep = 1;

    this.innSearchValue = inn;
  }


  // ============================================================
  // LOAD USER
  // ============================================================

  private loadUserData(): void {

    this.userApiService
      .getData()
      .pipe(
        catchError(() => of(null))
      )
      .subscribe({

        next: response => {

          if (!response?.data) {
            return;
          }

          this.setUserData(response.data);

          this.progress.step1 = true;

          if (!this.companyId) {
            this.currentStep = 2;
          }
        }

      });
  }


  private setUserData(user: any): void {

    this.isActiveUser = true;

    this.userRegistered = true;

    this.registeredUserId = user.id;


    let birthdayValue = null;


    if (user.birthday) {

      const date =
        new Date(user.birthday);

      const year =
        date.getFullYear();

      const month =
        String(date.getMonth() + 1)
          .padStart(2, '0');

      const day =
        String(date.getDate())
          .padStart(2, '0');

      birthdayValue =
        `${year}-${month}-${day}`;
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
  }


  // ============================================================
  // REGISTER USER
  // ============================================================

  async registerUserBeforeStep2(): Promise<boolean> {

    if (this.userRegistered) {

      return true;
    }


    if (!this.userForm.valid) {

      this.userForm.markAllAsTouched();

      this.error =
        'Пожалуйста, заполните все обязательные поля';

      return false;
    }


    this.isRegisteringUser = true;

    this.error = null;


    try {

      const birthdayValue =
        this.userForm.get('birthday')?.value;

      let formattedBirthday = null;


      if (birthdayValue) {

        const date =
          new Date(birthdayValue);

        if (!isNaN(date.getTime())) {

          formattedBirthday =
            date.toISOString();
        }
      }


      const registerData = {

        email:
          this.userForm.get('email')?.value,

        password:
          this.userForm.get('password')?.value,

        isEmailSend:
          'false'

      };


      const registerResponse =
        await this.authService
          .register(registerData)
          .toPromise();


      const token =
        registerResponse?.data?.token;


      if (!token) {

        throw new Error(
          'Не удалось получить токен'
        );
      }


      this.registeredUserToken =
        token;


      StorageUtils.setLocalStorageCache(
        localStorageEnvironment.auth.key,
        token,
        localStorageEnvironment.auth.ttl
      );


      const userFormData = {

        firstName:
          this.userForm.get('firstName')?.value,

        lastName:
          this.userForm.get('lastName')?.value,

        middleName:
          this.userForm.get('middleName')?.value || '',

        birthday:
          formattedBirthday,

        phoneNumber:
          this.userForm.get('phoneNumber')?.value,

        email:
          this.userForm.get('email')?.value
      };


      const userResponse =
        await this.userApiService
          .updateData(userFormData)
          .pipe(
            switchMap(() =>
              this.userApiService.getData()
            )
          )
          .toPromise();


      if (!userResponse?.data) {

        throw new Error(
          'Не удалось получить данные пользователя'
        );
      }


      this.userService.setUser(
        userResponse.data,
        'session',
        true
      );


      this.registeredUserId =
        userResponse.data.id;

      this.userRegistered = true;

      this.progress.step1 = true;

      this.isRegisteringUser = false;

      this.showSuccessToast(
        'Пользователь успешно создан'
      );

      return true;

    } catch (error: any) {

      this.isRegisteringUser = false;

      this.error =
        error?.error?.message ||
        error?.message ||
        'Ошибка при регистрации пользователя';

      return false;
    }
  }


  // ============================================================
  // COMPANY SEARCH
  // ============================================================

  searchByInn(): void {

    const inn =
      this.innSearchValue?.trim();


    if (!inn) {

      this.innSearchError =
        'Введите ИНН';

      return;
    }


    this.searchPartnerByInn(inn);
  }


  private searchPartnerByInn(
    inn: string
  ): void {

    this.isSearchingByInn = true;

    this.searchAttempted = true;

    this.innSearchError = null;

    this.innSearchResult = null;

    this.hasCompany = null;

    this.error = null;


    this.partnerService
      .getPartnerByInn(inn)
      .pipe(
        catchError(error => {

          if (error?.status === 404) {

            return of({
              data: null,
              companyNotFound: true
            });
          }


          throw error;
        }),

        finalize(() => {

          this.isSearchingByInn = false;
        })
      )
      .subscribe({

        next: (response: any) => {

          if (
            response?.companyNotFound ||
            !response?.data
          ) {

            this.handleCompanyNotFound();

            return;
          }


          const company =
            response.data;


          const hasRequiredData =
            !!company.fullName &&
            !!company.inn &&
            !!company.ogrn;


          if (!hasRequiredData) {

            this.handleCompanyNotFound();

            return;
          }


          // Компания существует.
          this.hasCompany = true;

          this.companyId =
            company.id || null;

          this.existingPartner =
            company;

          this.innSearchResult =
            company;

          this.showCompanyForm = true;


          this.fillCompanyForm(company);


          this.progress.step2 = true;

          this.currentStep = 3;


          this.showSuccessToast(
            'Компания найдена. Переходим к параметрам франшизы'
          );
        },

        error: error => {

          this.innSearchError =
            'Ошибка при поиске компании';

          this.error =
            'Не удалось выполнить поиск компании';

          console.error(
            'Ошибка поиска компании:',
            error
          );
        }

      });
  }


  /**
   * Сценарий:
   * пользователь ввёл ИНН,
   * backend вернул 404.
   *
   * ВАЖНО:
   * Никакой ручной регистрации компании.
   * Сразу третий шаг.
   */
  private handleCompanyNotFound(): void {

    this.hasCompany = false;

    this.companyId = null;

    this.existingPartner = null;

    this.innSearchResult = null;

    this.showCompanyForm = false;

    this.progress.step2 = true;

    this.currentStep = 3;

    this.showSuccessToast(
      'Компания не найдена. Можно продолжить без компании'
    );
  }


  /**
   * Пользователь вообще не имеет компании
   * и не хочет искать её по ИНН.
   */
  skipCompanyStep(): void {

    this.hasCompany = false;

    this.companyId = null;

    this.existingPartner = null;

    this.showCompanyForm = false;

    this.innSearchResult = null;

    this.innSearchError = null;

    this.progress.step2 = true;

    this.currentStep = 3;

    this.scrollToTop();
  }


  private fillCompanyForm(
    company: any
  ): void {

    this.companyForm.patchValue({

      fullName:
        company.fullName || '',

      shortName:
        company.shortName || '',

      inn:
        company.inn || '',

      ogrn:
        company.ogrn || '',

      kpp:
        company.kpp || '',

      workDirection:
        company.workDirection || '',

      partnerTypeId:
        company.partnerType?.id ||
        company.partnerTypeId ||
        ''

    });


    if (company.address) {

      this.companyForm
        .get('address')
        ?.patchValue({

          country:
            company.address.country ||
            'Россия',

          region:
            company.address.region ||
            '',

          city:
            company.address.city ||
            '',

          street:
            company.address.street ||
            '',

          house:
            company.address.house ||
            '',

          postIndex:
            company.address.postIndex ||
            ''

        });
    }
  }


  // ============================================================
  // LOAD EXISTING PARTNER BY ID
  // ============================================================

  private loadUserDataAndPartner(): void {

    this.isLoadingPartner = true;


    this.userApiService
      .getData()
      .pipe(

        switchMap(userResponse => {

          this.setUserData(
            userResponse.data
          );

          this.progress.step1 = true;

          return this.partnerService
            .getPartnerById(
              this.companyId!
            );
        }),

        finalize(() => {

          this.isLoadingPartner = false;
        }),

        catchError(error => {

          this.error =
            'Ошибка при загрузке данных компании';

          return of(null);
        })

      )
      .subscribe({

        next: partnerResponse => {

          if (
            !partnerResponse?.data
          ) {

            this.error =
              'Компания не найдена';

            return;
          }


          this.existingPartner =
            partnerResponse.data;

          this.hasCompany = true;

          this.showCompanyForm = true;

          this.fillCompanyForm(
            partnerResponse.data
          );

          this.progress.step2 = true;

          this.currentStep = 3;
        }

      });
  }


  // ============================================================
  // INVESTMENT TYPES
  // ============================================================

  private loadInvestmentTypes(): void {

    this.isLoadingInvestmentTypes = true;

    this.investmentTypesService.getData({
      filters: [],
      sorts: [],
      page: 0,
      pageSize: 50
    }).subscribe((value: any) => {
      this.isLoadingInvestmentTypes = false;
      this.investmentTypes = value.data;
    })
  
  }

  // ============================================================
  // OFFICE TYPES
  // ============================================================

  private loadOfficeTypes(): void {

    this.isLoadingOfficeTypes = true;

    this.officeTypesService.getData({
      filters: [],
      sorts: [],
      page: 0,
      pageSize: 50
    }).subscribe((value: any) => {
      this.isLoadingOfficeTypes = false;
      this.officeTypes = value.data;
    })
  }


  // ============================================================
  // NEXT STEP
  // ============================================================

  async nextStep(): Promise<void> {

    this.error = null;


    // ----------------------------------------------------------
    // STEP 1
    // ----------------------------------------------------------

    if (this.currentStep === 1) {

      if (this.isActiveUser) {

        if (!this.validateUserStep()) {
          return;
        }

        this.progress.step1 = true;

        this.currentStep = 2;

        this.scrollToTop();

        return;
      }


      const registered =
        await this.registerUserBeforeStep2();


      if (!registered) {
        return;
      }


      this.currentStep = 2;

      this.scrollToTop();

      return;
    }


    // ----------------------------------------------------------
    // STEP 2
    // ----------------------------------------------------------

    if (this.currentStep === 2) {

      /**
       * Если компания уже была найдена
       * автоматически — ничего больше не нужно.
       */
      if (this.hasCompany === true) {

        this.progress.step2 = true;

        this.currentStep = 3;

        this.scrollToTop();

        return;
      }


      /**
       * Если пользователь явно выбрал
       * "У меня пока нет компании".
       */
      if (this.hasCompany === false) {

        this.progress.step2 = true;

        this.currentStep = 3;

        this.scrollToTop();

        return;
      }


      /**
       * Если поиск ещё не выполнялся.
       */
      if (!this.innSearchValue?.trim()) {

        this.error =
          'Введите ИНН или выберите «У меня пока нет компании»';

        return;
      }


      this.searchByInn();

      return;
    }


    // ----------------------------------------------------------
    // STEP 3
    // ----------------------------------------------------------

    if (this.currentStep === 3) {

      if (!this.validateFranchiseStep()) {
        return;
      }


      this.progress.step3 = true;

      await this.submitFranchiseOrder();
    }
  }


  // ============================================================
  // USER VALIDATION
  // ============================================================

  private validateUserStep(): boolean {

    const requiredFields = [
      'email',
      'firstName',
      'lastName',
      'phoneNumber',
      'agreeToTerms'
    ];


    for (const field of requiredFields) {

      const control =
        this.userForm.get(field);

      if (!control?.valid) {

        control?.markAsTouched();

        this.error =
          'Пожалуйста, заполните все обязательные поля';

        return false;
      }
    }


    return true;
  }


  // ============================================================
  // FRANCHISE VALIDATION
  // ============================================================

  private validateFranchiseStep(): boolean {

    if (
      this.isLoadingInvestmentTypes ||
      this.isLoadingOfficeTypes
    ) {

      this.error =
        'Дождитесь загрузки вариантов';

      return false;
    }


    if (
      !this.investmentTypes.length
    ) {

      this.error =
        'Не загружены типы инвестиций';

      return false;
    }


    if (
      !this.officeTypes.length
    ) {

      this.error =
        'Не загружены типы помещений';

      return false;
    }


    if (
      !this.franchiseForm.valid
    ) {

      this.franchiseForm.markAllAsTouched();

      const investment =
        this.franchiseForm.get(
          'investmentTypeId'
        );

      const office =
        this.franchiseForm.get(
          'officeTypeId'
        );

      const city =
        this.franchiseForm.get(
          'city'
        );


      if (!investment?.valid) {

        this.error =
          'Выберите тип инвестиций';

        return false;
      }


      if (!office?.valid) {

        this.error =
          'Выберите тип помещения';

        return false;
      }


      if (!city?.valid) {

        this.error =
          'Укажите город';

        return false;
      }


      return false;
    }


    return true;
  }


  // ============================================================
  // CREATE FRANCHISE ORDER
  // ============================================================

  private submitFranchiseOrder(): Promise<boolean> {

    return new Promise(resolve => {

      if (!this.registeredUserId) {

        this.error =
          'ID пользователя не найден';

        resolve(false);

        return;
      }


      const formValue =
        this.franchiseForm.value;


      let request: FranchiseOrderDto = {

        city:
          String(formValue.city).trim(),

        rejectionReason:
          '',

        // orderDateTime:
        //   new Date().toISOString(),

        /**
         * Если компания есть:
         *
         *   partnerInstanceId = ID компании
         *
         * Если компании нет:
         *
         *   partnerInstanceId = null
         */
        // partnerInstanceId:
        //   this.hasCompany && this.companyId
        //     ? this.companyId
        //     : null,

        // userInstanceId:
        //   this.registeredUserId,

        investmentTypeId:
          formValue.investmentTypeId,

        officeTypeId:
          formValue.officeTypeId
      };

      if(this.companyId) request.partnerInstanceId = this.companyId

      console.log(
        'FRANCHISE ORDER REQUEST:',
        request
      );


      this.isSubmitting = true;

      this.error = null;


      /**
       * Здесь используется POST endpoint заявки.
       *
       * В вашем Swagger в сообщении URL метода создания
       * заявки не указан, поэтому endpoint вынесен отдельно.
       *
       * Если в Swagger он называется иначе —
       * меняется только эта строка.
       */
      const createOrderUrl =
        `${environment.production}/api/Entities/FranchiseOrder`;


      this.http
        .post<any>(
          createOrderUrl,
          request,
        )
        .pipe(

          takeUntil(this.destroy$),

          finalize(() => {

            this.isSubmitting = false;
          }),

          catchError(error => {

            console.error(
              'Ошибка создания франшизной заявки:',
              error
            );

            this.error =
              error?.error?.message ||
              error?.message ||
              'Не удалось создать заявку';

            return of(null);
          })

        )
        .subscribe(response => {

          if (!response) {

            resolve(false);

            return;
          }


          this.showSuccessToast(
            'Заявка на франшизу успешно создана'
          );


          this.success = true;

          this.scrollToTop();

          resolve(true);
        });
    });
  }


  // ============================================================
  // NAVIGATION
  // ============================================================

  prevStep(): void {

    if (this.currentStep <= 1) {
      return;
    }


    /**
     * Если на третьем шаге компания уже определена,
     * назад возвращаемся на шаг 2.
     */
    this.currentStep--;

    this.error = null;

    this.scrollToTop();
  }


  goToStep(step: number): void {

    if (
      step < 1 ||
      step > this.totalSteps
    ) {
      return;
    }


    /**
     * Можно перейти только на уже пройденные шаги.
     */
    if (
      step <= this.currentStep
    ) {

      this.currentStep = step;

      this.error = null;

      this.scrollToTop();
    }
  }


  // ============================================================
  // PROGRESS
  // ============================================================

  getProgressPercentage(): number {

    let progress = 0;


    if (this.progress.step1) {
      progress += 33;
    }


    if (this.progress.step2) {
      progress += 33;
    }


    if (this.progress.step3) {
      progress += 34;
    }


    return progress;
  }


  getStepStatus(
    step: number
  ): 'completed' | 'current' | 'pending' {

    if (
      (step === 1 && this.progress.step1) ||
      (step === 2 && this.progress.step2) ||
      (step === 3 && this.progress.step3)
    ) {

      return 'completed';
    }


    if (step === this.currentStep) {
      return 'current';
    }


    return 'pending';
  }


  getStepTitle(step: number): string {

    switch (step) {

      case 1:
        return 'Пользователь';

      case 2:
        return 'Компания';

      case 3:
        return 'Франшиза';

      default:
        return '';
    }
  }


  getStepSubtitle(step: number): string {

    switch (step) {

      case 1:
        return 'Регистрация';

      case 2:
        return 'Компания';

      case 3:
        return 'Параметры';

      default:
        return '';
    }
  }


  // ============================================================
  // PASSWORD
  // ============================================================

  private updatePasswordStrength(
    password: string
  ): void {

    const hints = [

      {
        message: 'Минимум 8 символов',
        valid: password?.length >= 8
      },

      {
        message: 'Хотя бы одна буква',
        valid: /[A-Za-z]/.test(password || '')
      },

      {
        message: 'Хотя бы одна цифра',
        valid: /\d/.test(password || '')
      }

    ];


    const level =
      hints.filter(item => item.valid).length;


    this.passwordStrength = {
      level,
      hints
    };
  }


  passwordsMatch(): boolean {

    const password =
      this.userForm.get('password')?.value;

    const confirmPassword =
      this.userForm.get('confirmPassword')?.value;


    return !!password &&
      password === confirmPassword;
  }


  getPasswordMatchMessage(): string {

    const control =
      this.userForm.get('confirmPassword');


    if (!control?.touched) {
      return '';
    }


    return this.passwordsMatch()
      ? 'Пароли совпадают'
      : 'Пароли не совпадают';
  }


  // ============================================================
  // UI
  // ============================================================

  togglePasswordVisibility(): void {

    this.showPassword =
      !this.showPassword;
  }


  toggleConfirmPasswordVisibility(): void {

    this.showConfirmPassword =
      !this.showConfirmPassword;
  }


  toggleHelp(): void {

    this.showHelp =
      !this.showHelp;
  }


  showSuccessToast(
    message: string
  ): void {

    const toast =
      document.createElement('div');

    toast.className =
      'success-toast';


    toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">✓</div>
        <div class="toast-message">
          ${message}
        </div>
      </div>
    `;


    document.body.appendChild(toast);


    setTimeout(() => {

      toast.classList.add('show');

    }, 10);


    setTimeout(() => {

      toast.classList.remove('show');

      setTimeout(() => {

        toast.remove();

      }, 300);

    }, 3000);
  }


  private scrollToTop(): void {

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }


  // ============================================================
  // RESET
  // ============================================================

  createAnother(): void {

    this.success = false;

    this.resetAllForms();
  }


  private resetAllForms(): void {

    this.userForm.reset();

    this.companyForm.reset();

    this.franchiseForm.reset();


    this.currentStep = 1;


    this.progress = {
      step1: false,
      step2: false,
      step3: false
    };


    this.error = null;


    this.companyId = null;

    this.existingPartner = null;

    this.hasCompany = null;

    this.showCompanyForm = false;


    this.innSearchValue = '';

    this.innSearchResult = null;

    this.innSearchError = null;

    this.searchAttempted = false;


    this.selectedInvestmentType = null;

    this.selectedOfficeType = null;


    this.userRegistered = false;

    this.registeredUserId = null;

    this.registeredUserToken = null;
  }
}