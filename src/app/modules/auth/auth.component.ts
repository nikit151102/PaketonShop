import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
import { localStorageEnvironment } from '../../../environment';
import { UserService } from '../../core/services/user.service';
import { Router } from '@angular/router';
import { UserApiService } from '../../core/api/user.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent implements OnInit, OnDestroy {
  visible: boolean = false;
  authForm: FormGroup;
  isSubmitting: boolean = false;
  authMode: 'login' | 'register' = 'login';
  
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
      pattern: 'Пароль должен содержать буквы и цифры'
    },
    confirmPassword: {
      required: 'Подтверждение пароля обязательно',
      mismatch: 'Пароли не совпадают'
    }
  };

  constructor(
    private authService: AuthService,
    private fb: FormBuilder,
    private userService: UserService,
    private router: Router,
    private userApiService: UserApiService,
  ) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
      ]],
      confirmPassword: ['']
    }, { validators: this.passwordMatchValidator() });
  }

  ngOnInit(): void {
    this.authService.visiblePopUp$.subscribe((value: boolean) => {
      this.visible = value;
      if (value) {
        this.resetForm();
      }
    });

    // Subscribe to form value changes for real-time validation
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
  }

  // Custom validator for password matching
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

  // Check if password has numbers
  hasNumbers(password: string | null | undefined): boolean {
    if (!password) return false;
    return /\d/.test(password);
  }

  // Check if password meets all requirements
  isPasswordValid(password: string | null | undefined): boolean {
    if (!password) return false;
    return password.length >= 8 && this.hasLetters(password) && this.hasNumbers(password);
  }

  // Update error messages
  updateFormErrors(): void {
    this.formErrors = {};
    
    Object.keys(this.authForm.controls).forEach(field => {
      const control = this.authForm.get(field);
      
      if (control && control.invalid && (control.dirty || control.touched)) {
        const messages = this.validationMessages[field as keyof typeof this.validationMessages];
        if (messages) {
          Object.keys(control.errors || {}).forEach(key => {
            this.formErrors[field] = messages[key as keyof typeof messages] || `Ошибка: ${key}`;
          });
        }
      }
    });

    // Check for form-level errors
    if (this.authForm.errors?.['passwordMismatch']) {
      this.formErrors['confirmPassword'] = this.validationMessages.confirmPassword.mismatch;
    }
  }

  closePopUp() {
    this.authService.changeVisible(false);
  }

  onSubmit(): void {
    if (this.authForm.invalid) {
      // Mark all fields as touched to trigger validation messages
      Object.keys(this.authForm.controls).forEach(key => {
        const control = this.authForm.get(key);
        control?.markAsTouched();
        control?.updateValueAndValidity();
      });
      this.updateFormErrors();
      return;
    }

    this.isSubmitting = true;

    if (this.authMode === 'login') {
      const { email, password } = this.authForm.value;
      this.authService.login(email, email, password).subscribe({
        next: (response: any) => {
          this.handleLoginSuccess(response);
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
      
      this.authService.register(data).subscribe({
        next: (res) => {
          this.handleRegistrationSuccess(res);
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

  private handleLoginSuccess(response: any): void {
    StorageUtils.setLocalStorageCache(
      localStorageEnvironment.auth.key,
      response.data.token,
      localStorageEnvironment.auth.ttl,
    );

    this.userApiService.getData().subscribe((data) => {
      this.userService.setUser(data.data, 'session', true);
      this.closePopUp();
      this.router.navigate(['/profile']);
    });
  }

  private handleRegistrationSuccess(res: any): void {
    // Show success message and switch to login mode
    this.authMode = 'login';
    this.authForm.patchValue({
      email: this.authForm.get('email')?.value,
      password: '',
      confirmPassword: ''
    });
    
    // Show success toast or message
    console.log('Registration successful! Please login.');
  }

  private handleError(error: any): void {
    // Handle API errors
    if (error.error?.message) {
      this.formErrors['api'] = error.error.message;
    } else if (error.status === 401) {
      this.formErrors['api'] = 'Неверный email или пароль';
    } else if (error.status === 409) {
      this.formErrors['api'] = 'Пользователь с таким email уже существует';
    } else {
      this.formErrors['api'] = 'Произошла ошибка. Попробуйте еще раз';
    }
  }

  switchMode(mode: 'login' | 'register'): void {
    this.authMode = mode;
    this.resetForm();
  }

  resetForm(): void {
    this.authForm.reset();
    this.formErrors = {};
    this.isSubmitting = false;
    
    // Reset validators based on mode
    if (this.authMode === 'login') {
      this.authForm.get('confirmPassword')?.clearValidators();
    } else {
      this.authForm.get('confirmPassword')?.setValidators([Validators.required]);
    }
    this.authForm.get('confirmPassword')?.updateValueAndValidity();
  }

  ngOnDestroy(): void {
    this.resetForm();
  }
}