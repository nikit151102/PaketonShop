import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import {
  AbstractControl,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { StorageUtils } from '../../../utils/storage.utils';
import { localStorageEnvironment, memoryCacheEnvironment } from '../../../environment';
import { UserService } from '../../core/services/user.service';
import { Router } from '@angular/router';
import { UserApiService } from '../../core/api/user.service';
import { debounceTime, distinctUntilChanged, finalize, take } from 'rxjs/operators';
import { VkIdWidgetComponent } from '../../core/components/vk-id-button/vk-id-button.component';
import { YandexIdButtonComponent } from '../../core/components/yandex-id-button/yandex-id-button.component';
import { BasketsService } from '../../core/api/baskets.service';
import { BasketsStateService } from '../../core/services/baskets-state.service';
import { ToastService } from '../../core/components/toast/toast.service';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule, ReactiveFormsModule,],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent implements OnInit, OnDestroy {
  visible: boolean = false;
  authForm: FormGroup;
  isSubmitting: boolean = false;
  isRedirecting = computed(() => this.authService.isRedirectingToProfile())


  // Error messages
  formErrors: any = {};
  validationMessages = {
    email: {
      required: 'Email обязателен для заполнения',
      email: 'Введите корректный email адрес'
    },
    password: {
      required: 'Пароль обязателен для заполнения',
      minlength: 'Пароль должен содержать минимум 8 символов',
      pattern: 'Пароль должен содержать буквы, цифры и хотя бы одну заглавную букву'
    },
    confirmPassword: {
      required: 'Подтверждение пароля обязательно',
      mismatch: 'Пароли не совпадают'
    }
  };

  private readonly toast = inject(ToastService);

  // свойства для сброса пароля
  authMode: 'login' | 'register' | 'forgot-password' = 'login';
  restoreStep: 1 | 2 | 3 = 1;
  restoreEmail = '';
  restoreCode = '';
  isCodeSent = false;
  codeResendTimer = 0;
  private resendInterval: any;

  // Валидация кода
  codeValidationMessages = {
    required: 'Введите код',
    pattern: 'Код должен содержать 5 цифр',
    invalid: 'Неверный код'
  };

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private userApiService: UserApiService,
    private basketsService: BasketsService,
    private basketsStateService: BasketsStateService,
  ) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
      ]],
      confirmPassword: [''],
      // Поля для сброса пароля
      restoreCode: ['', [
        Validators.required,
        Validators.pattern(/^\d{5}$/)
      ]],
      newPassword: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
      ]],
      confirmNewPassword: ['']
    }, {
      validators: [
        this.passwordMatchValidator(),
        this.newPasswordMatchValidator()
      ]
    });
  }

  ngOnInit(): void {
    this.authService.visiblePopUp$.subscribe((value: boolean) => {
      this.visible = value;
      if (value) {
        const restoreData = this.authService.getRestoreData();
        if (restoreData && restoreData.email) {
          this.restoreFromSavedData(restoreData);
        } else {
          this.resetForm();
        }
      }
    });

    this.authForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.updateFormErrors();
      });

    // Update validation when mode changes
    this.authForm.get('confirmPassword')?.valueChanges.subscribe(() => {
      if (this.authMode === 'register') {
        this.authForm.updateValueAndValidity();
      }
    });

    this.checkActiveRestore();
  }

  /**
   * Восстановление состояния из сохранённых данных
   */
  private restoreFromSavedData(restoreData: {
    email: string;
    code?: string;
    step: 1 | 2 | 3;
    codeSentAt?: number | null;
  }): void {
    this.authMode = 'forgot-password';
    this.restoreEmail = restoreData.email;

    this.restoreStep = restoreData.step || (restoreData.code ? 3 : 2);
    this.isCodeSent = this.restoreStep >= 2;
    this.formErrors = {};

    this.authForm.patchValue({
      email: restoreData.email,
      restoreCode: restoreData.code || '',
      newPassword: '',
      confirmNewPassword: ''
    });

    this.updateValidatorsForCurrentStep();

    // Если на шаге 2, запускаем таймер (или вычисляем оставшееся время)
    if (this.restoreStep === 2 && restoreData.codeSentAt) {
      const elapsed = Math.floor((Date.now() - restoreData.codeSentAt) / 1000);
      const remaining = Math.max(0, 60 - elapsed);

      if (remaining > 0) {
        this.codeResendTimer = remaining;
        this.startResendTimerFrom(remaining);
      }
    }
  }


  private startResendTimerFrom(seconds: number): void {
    this.codeResendTimer = seconds;
    this.resendInterval = setInterval(() => {
      this.codeResendTimer--;
      if (this.codeResendTimer <= 0) {
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  /**
   * Обновление валидаторов для текущего шага восстановления
   */
  private updateValidatorsForCurrentStep(): void {
    const emailControl = this.authForm.get('email');
    const passwordControl = this.authForm.get('password');
    const confirmPasswordControl = this.authForm.get('confirmPassword');
    const confirmNewPasswordControl = this.authForm.get('confirmNewPassword');
    const restoreCodeControl = this.authForm.get('restoreCode');
    const newPasswordControl = this.authForm.get('newPassword');

    // ✅ Сбрасываем ВСЕ валидаторы
    emailControl?.clearValidators();
    passwordControl?.clearValidators();
    confirmPasswordControl?.clearValidators();
    confirmNewPasswordControl?.clearValidators();
    restoreCodeControl?.clearValidators();
    newPasswordControl?.clearValidators();

    // ✅ Устанавливаем только нужные для текущего шага
    if (this.restoreStep === 1) {
      emailControl?.setValidators([Validators.required, Validators.email]);
    }
    else if (this.restoreStep === 2) {
      restoreCodeControl?.setValidators([
        Validators.required,
        Validators.pattern(/^\d{5}$/)
      ]);
    }
    else if (this.restoreStep === 3) {
      newPasswordControl?.setValidators([
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
      ]);
      confirmNewPasswordControl?.setValidators([Validators.required]);
    }

    // ✅ Обновляем все контролы
    emailControl?.updateValueAndValidity();
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
    confirmNewPasswordControl?.updateValueAndValidity();
    restoreCodeControl?.updateValueAndValidity();
    newPasswordControl?.updateValueAndValidity();

    this.authForm.updateValueAndValidity();
  }

  goToRestoreStep(step: 1 | 2 | 3): void {
    this.restoreStep = step;
    this.formErrors = {};
    this.updateValidatorsForCurrentStep();
  }

  /**
   * Проверка, есть ли активный процесс восстановления
   */
  private checkActiveRestore(): void {
    const restoreData = this.authService.getRestoreData();

    if (restoreData && restoreData.email) {
      this.restoreFromSavedData(restoreData);
    }
  }

  /**
   * Переключение на режим сброса пароля
   */
  startForgotPassword(): void {
    this.authMode = 'forgot-password';
    this.restoreStep = 1;
    this.restoreEmail = '';
    this.restoreCode = '';
    this.isCodeSent = false;
    this.formErrors = {};

    this.authForm.patchValue({
      email: '',
      restoreCode: '',
      newPassword: '',
      confirmNewPassword: ''
    });

    this.updateValidatorsForCurrentStep();
  }

  /**
   * Возврат к режиму входа
   */
  backToLogin(): void {
    this.authMode = 'login';
    this.authService.clearRestoreData();
    this.resetForm();
  }

  /**
   * Шаг 1: Отправка кода на email
   */
  sendRestoreCode(): void {
    const email = this.authForm.get('email')?.value;

    if (!email || this.authForm.get('email')?.invalid) {
      this.formErrors['email'] = this.validationMessages.email.required;
      return;
    }

    this.isSubmitting = true;
    this.formErrors = {};

    this.authService.restorePassword(email).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (success) => {
        if (success) {
          this.restoreEmail = email;
          this.isCodeSent = true;
          this.restoreStep = 2;

          // Сохраняем email И step=2
          this.authService.saveRestoreData(email, undefined, 2);
          this.updateValidatorsForCurrentStep();
          this.startResendTimer();

          this.toast.success(
            'Код отправлен на ваш email',
            'Проверьте папку "Спам", если письмо не пришло'
          );
        } else {
          this.formErrors['api'] = 'Не удалось отправить код. Проверьте email.';
        }
      },
      error: (err) => {
        this.formErrors['api'] = err.error?.message || 'Ошибка при отправке кода';
      }
    });
  }

  /**
   * Шаг 2: Проверка кода
   */
  verifyRestoreCode(): void {
    const code = this.authForm.get('restoreCode')?.value;

    if (!code || this.authForm.get('restoreCode')?.invalid) {
      this.formErrors['restoreCode'] = this.codeValidationMessages.required;
      return;
    }

    this.isSubmitting = true;
    this.formErrors = {};

    this.authService.confirmRestoreCode(this.restoreEmail, code).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (success) => {
        if (success) {
          // Сохраняем email, code И step=3
          this.authService.saveRestoreData(this.restoreEmail, code, 3);
          this.restoreCode = code;
          this.restoreStep = 3;
          this.updateValidatorsForCurrentStep();
          this.toast.success('Код подтверждён', 'Теперь задайте новый пароль');
        } else {
          this.formErrors['restoreCode'] = this.codeValidationMessages.invalid;
        }
      },
      error: (err) => {
        this.formErrors['api'] = err.error?.message || 'Ошибка проверки кода';
      }
    });
  }

  /**
   * Шаг 3: Смена пароля
   */
  changePassword(): void {
    const newPassword = this.authForm.get('newPassword')?.value;
    const confirmNewPassword = this.authForm.get('confirmNewPassword')?.value;

    if (!newPassword || !confirmNewPassword) {
      this.formErrors['newPassword'] = 'Заполните все поля';
      return;
    }

    if (newPassword !== confirmNewPassword) {
      this.formErrors['confirmNewPassword'] = 'Пароли не совпадают';
      return;
    }

    this.isSubmitting = true;
    this.formErrors = {};

    this.authService.changeRestorePassword(
      this.restoreEmail,
      this.restoreCode,
      newPassword
    ).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (response) => {
        // Очистка данных восстановления
        this.authService.clearRestoreData();

        this.toast.success(
          'Пароль успешно изменён',
          'Теперь войдите с новым паролем'
        );

        // Возврат к экрану входа с предустановленным email
        this.authMode = 'login';
        this.authForm.patchValue({
          email: this.restoreEmail,
          password: '',
          confirmPassword: ''
        });
        this.resetForm();
      },
      error: (err) => {
        this.formErrors['api'] = err.error?.message || 'Ошибка при смене пароля';
      }
    });
  }

  /**
   * Повторная отправка кода
   */
  resendCode(): void {
    if (this.codeResendTimer > 0) return;

    this.sendRestoreCode();
  }

  /**
   * Запуск таймера повторной отправки (60 секунд)
   */
  private startResendTimer(): void {
    this.codeResendTimer = 60;

    this.resendInterval = setInterval(() => {
      this.codeResendTimer--;

      if (this.codeResendTimer <= 0) {
        clearInterval(this.resendInterval);
      }
    }, 1000);
  }

  /**
   * Валидатор для совпадения новых паролей
   */
  newPasswordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (this.authMode !== 'forgot-password' || this.restoreStep !== 3) {
        return null;
      }

      const newPassword = control.get('newPassword')?.value;
      const confirmNewPassword = control.get('confirmNewPassword')?.value;

      if (newPassword && confirmNewPassword && newPassword !== confirmNewPassword) {
        return { passwordMismatch: true };
      }
      return null;
    };
  }


  /**
   * Обновление ошибок формы с учётом режима сброса пароля
   */
  updateFormErrors(): void {
    this.formErrors = {};

    // === Стандартные поля (login/register) ===
    if (this.authMode === 'login' || this.authMode === 'register') {
      const controlsToCheck = ['email', 'password', 'confirmPassword'];

      controlsToCheck.forEach((field: string) => {
        const control = this.authForm.get(field);
        if (control?.invalid && (control.dirty || control.touched)) {
          // ✅ Безопасный доступ к сообщениям без typeof this
          const messages = (this.validationMessages as any)[field];
          if (messages && control.errors) {
            const errorKey = Object.keys(control.errors)[0];
            this.formErrors[field] = messages[errorKey] || 'Ошибка валидации';
          }
        }
      });
    }

    // === Поля для сброса пароля ===
    if (this.authMode === 'forgot-password') {

      // Шаг 1: email
      if (this.restoreStep === 1) {
        const emailControl = this.authForm.get('email');
        if (emailControl?.invalid && (emailControl.dirty || emailControl.touched)) {
          const emailMessages = this.validationMessages.email;
          if (emailControl.errors) {
            const errorKey = Object.keys(emailControl.errors)[0];
            this.formErrors['email'] = emailMessages[errorKey as keyof typeof emailMessages] || 'Неверный email';
          }
        }
      }

      // Шаг 2: код
      if (this.restoreStep === 2) {
        const codeControl = this.authForm.get('restoreCode');
        if (codeControl?.invalid && (codeControl.dirty || codeControl.touched)) {
          if (codeControl.errors) {
            const errorKey = Object.keys(codeControl.errors)[0];
            // ✅ Простой объект без typeof this
            const codeMessages: { [key: string]: string } = {
              required: 'Введите код',
              pattern: 'Код должен содержать 5 цифр',
              invalid: 'Неверный код'
            };
            this.formErrors['restoreCode'] = codeMessages[errorKey] || 'Ошибка кода';
          }
        }
      }

      // Шаг 3: новый пароль
      if (this.restoreStep === 3) {
        const newPasswordControl = this.authForm.get('newPassword');
        const confirmControl = this.authForm.get('confirmNewPassword');

        if (newPasswordControl?.invalid && (newPasswordControl.dirty || newPasswordControl.touched)) {
          const passwordMessages = this.validationMessages.password;
          if (newPasswordControl.errors) {
            const errorKey = Object.keys(newPasswordControl.errors)[0];
            this.formErrors['newPassword'] = passwordMessages[errorKey as keyof typeof passwordMessages] || 'Ошибка пароля';
          }
        }

        if (confirmControl?.invalid && (confirmControl.dirty || confirmControl.touched)) {
          this.formErrors['confirmNewPassword'] = 'Пароли не совпадают';
        }
      }
    }

    // === Ошибки уровня формы ===
    if (this.authForm.errors?.['passwordMismatch']) {
      this.formErrors['confirmPassword'] = 'Пароли не совпадают';
      this.formErrors['confirmNewPassword'] = 'Пароли не совпадают';
    }
  }



  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const formGroup = control as FormGroup;
      if (this.authMode === 'register') {
        const password = formGroup.get('password')?.value;
        const confirmPassword = formGroup.get('confirmPassword')?.value;

        if (password && confirmPassword && password !== confirmPassword) {
          return { passwordMismatch: true };
        }
      }
      return null;
    };
  }

  // Check if password has letters
  hasLetters(password: string | null | undefined): boolean {
    if (!password) return false;
    return /[A-Za-z]/.test(password);
  }

  // Check if password has lowercase letters
  hasLowercase(password: string | null | undefined): boolean {
    if (!password) return false;
    return /[a-z]/.test(password);
  }

  // Check if password has uppercase letters
  hasUppercase(password: string | null | undefined): boolean {
    if (!password) return false;
    return /[A-Z]/.test(password);
  }

  // Check if password has numbers
  hasNumbers(password: string | null | undefined): boolean {
    if (!password) return false;
    return /\d/.test(password);
  }

  // Check if password meets all requirements
  isPasswordValid(password: string | null | undefined): boolean {
    if (!password) return false;
    return password.length >= 8 &&
      this.hasLowercase(password) &&
      this.hasUppercase(password) &&
      this.hasNumbers(password);
  }


  closePopUp() {
    this.authService.changeVisible(false);
  }

  onSubmit(): void {
    if (this.authMode === 'forgot-password') {
      if (this.restoreStep === 1) {
        this.sendRestoreCode();
      } else if (this.restoreStep === 2) {
        this.verifyRestoreCode();
      } else if (this.restoreStep === 3) {
        this.changePassword();
      }
      return;
    }
    if (this.authForm.invalid) {
      Object.keys(this.authForm.controls).forEach(key => {
        const control = this.authForm.get(key);
        control?.markAsTouched();
        control?.updateValueAndValidity();
      });
      this.updateFormErrors();
      this.toast.warning(
        'Пожалуйста, проверьте правильность заполнения полей',
        'Форма заполнена некорректно'
      );
      return;
    }

    this.isSubmitting = true;

    if (this.authMode === 'login') {
      const { email, password } = this.authForm.value;
      this.authService.login(email, email, password).pipe(
        finalize(() => {
          this.isSubmitting = false;
        }
        )
      ).subscribe({
        next: (response: any) => {
          this.handleLoginSuccess(response);
          this.userApiService.getOperativeInfo();
          this.userService.updateIsAuthUser(true);
        },
        error: (error) => {
          this.handleError(error);
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    } else {
      const data = {
        ...this.authForm.value,
        isEmailSend: 'false',
      };
      delete data.confirmPassword;

      const userSourceType = StorageUtils.getLocalStorageCache(localStorageEnvironment.pktSource.key);

      if (userSourceType) data.userSourceType = userSourceType;

      this.authService.register(data).pipe(
        finalize(() => {
          this.isSubmitting = false;
        })
      ).subscribe({
        next: (res) => {
          this.handleRegistrationSuccess(res);
          this.userApiService.getOperativeInfo();
          this.userService.updateIsAuthUser(true);
        },
        error: (err) => {
          this.handleError(err);
        },
        complete: () => {
          this.isSubmitting = false;
        }
      });
    }
  }


  private loadBaskets(): void {
    this.basketsService
      .filterBaskets({
        filters: [],
        sorts: [],
        page: 0,
        pageSize: 10,
      })
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          this.basketsStateService.updateBaskets(res.data);
        },
        error: (err) => this.toast.error(
          err?.error?.message ?? 'Не удалось загрузить корзины',
          'Ошибка загрузки'
        ),
      });
  }

  private handleLoginSuccess(response: any): void {
    localStorage.removeItem(localStorageEnvironment.isGuestToken.key)
    this.authService.handleLoginSuccess(response);
    this.userApiService.getData().subscribe((data) => {
      this.userService.setUser(data.data, 'session', true);
      this.closePopUp();

      this.loadBaskets();

      this.toast.success(
        `Добро пожаловать!`,
        'Вы успешно вошли'
      );

      if (this.isRedirecting() == true) {
        this.router.navigate(['/profile']);
      }
    });
  }

  private handleRegistrationSuccess(res: any): void {
    const userEmail = this.authForm.get('email')?.value;

    this.authMode = 'login';

    this.resetForm();

    this.authForm.patchValue({
      email: userEmail,
      password: '',
      confirmPassword: ''
    });

    this.authForm.get('email')?.markAsTouched();
    this.authForm.get('password')?.markAsTouched();
    this.authForm.updateValueAndValidity();

    this.toast.success(
      'Теперь войдите в систему, используя свой email и пароль',
      'Регистрация прошла успешно'
    );
  }

  private handleError(error: any): void {
    let message = 'Произошла ошибка. Попробуйте еще раз';

    if (error.error?.Message) {
      message = error.error.Message;
    } else if (error.status === 401) {
      message = 'Неверный email или пароль';
    } else if (error.status === 409) {
      message = 'Пользователь с таким email уже существует';
    } else {
      message = 'Нет соединения с сервером. Проверьте интернет';
    }

    this.formErrors['api'] = message;

    this.toast.error(message, 'Ошибка');
  }

  switchMode(mode: 'login' | 'register'): void {
    this.authMode = mode;
    this.resetForm();
  }


  /**
 * Обработчик ввода кода: авто-фокус и форматирование
 */
  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, ''); // Только цифры

    // Ограничиваем 5 символами
    if (value.length > 5) {
      value = value.slice(0, 5);
    }

    input.value = value;
    this.authForm.get('restoreCode')?.setValue(value);

    // Авто-отправка при вводе 5 цифр
    if (value.length === 5 && this.authForm.get('restoreCode')?.valid) {
      // Опционально: можно авто-подтверждать
      // this.verifyRestoreCode();
    }
  }


  /**
   * Сброс формы с учётом режима
   */
  resetForm(): void {
    this.authForm.reset({
      email: '',
      password: '',
      confirmPassword: '',
      restoreCode: '',
      newPassword: '',
      confirmNewPassword: ''
    });

    this.formErrors = {};
    this.isSubmitting = false;

    // Получаем все контролы
    const confirmPasswordControl = this.authForm.get('confirmPassword');
    const confirmNewPasswordControl = this.authForm.get('confirmNewPassword');
    const restoreCodeControl = this.authForm.get('restoreCode');
    const newPasswordControl = this.authForm.get('newPassword');

    if (this.authMode === 'login') {
      // ✅ В режиме входа: очищаем ВСЕ валидаторы кроме email/password
      confirmPasswordControl?.clearValidators();
      confirmNewPasswordControl?.clearValidators();
      restoreCodeControl?.clearValidators();      // ← Было пропущено!
      newPasswordControl?.clearValidators();      // ← Было пропущено!
    }
    else if (this.authMode === 'register') {
      // ✅ В режиме регистрации: только confirmPassword обязателен
      confirmPasswordControl?.setValidators([Validators.required]);
      confirmNewPasswordControl?.clearValidators();
      restoreCodeControl?.clearValidators();      // ← Было пропущено!
      newPasswordControl?.clearValidators();      // ← Было пропущено!
    }
    else if (this.authMode === 'forgot-password') {
      // ✅ В режиме сброса пароля: настраиваем валидаторы по шагам
      confirmPasswordControl?.clearValidators();

      if (this.restoreStep === 3) {
        confirmNewPasswordControl?.setValidators([Validators.required]);
        newPasswordControl?.setValidators([
          Validators.required,
          Validators.minLength(8),
          Validators.pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).+$/)
        ]);
      } else {
        confirmNewPasswordControl?.clearValidators();
        newPasswordControl?.clearValidators();
      }

      if (this.restoreStep === 2) {
        restoreCodeControl?.setValidators([
          Validators.required,
          Validators.pattern(/^\d{5}$/)
        ]);
      } else {
        restoreCodeControl?.clearValidators();
      }
    }

    // ✅ Обновляем валидацию всех контролов
    confirmPasswordControl?.updateValueAndValidity();
    confirmNewPasswordControl?.updateValueAndValidity();
    restoreCodeControl?.updateValueAndValidity();   // ← Было пропущено!
    newPasswordControl?.updateValueAndValidity();   // ← Было пропущено!

    // ✅ Финальное обновление всей формы
    this.authForm.updateValueAndValidity();
  }

  ngOnDestroy(): void {
    if (this.resendInterval) {
      clearInterval(this.resendInterval);
    }
    this.resetForm();
  }

}
