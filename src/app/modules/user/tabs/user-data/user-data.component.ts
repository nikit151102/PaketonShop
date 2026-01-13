import { Component, inject, OnInit, HostListener, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { trigger, transition, style, animate } from '@angular/animations';
import { LoyaltyComponent } from './loyalty/loyalty.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';
import { UserApiService } from '../../../../core/api/user.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PartnerCardsComponent } from '../../components/partner-cards/partner-cards.component';

@Component({
  selector: 'app-user-data',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PartnerCardsComponent,
    LoyaltyComponent,
  ],
  templateUrl: './user-data.component.html',
  styleUrls: ['./user-data.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)',
          style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class UserDataComponent implements OnInit {

  @ViewChild('avatarUploadInput') avatarUploadInput!: ElementRef<HTMLInputElement>;

  userForm!: FormGroup;
  isSubmitting = false;
  avatarLoading = false;
  minAge = 16;
  successMessage = '';
  errorMessage = '';
  showAvatarModal = false;
  isDragOver = false;
  lastSaved: Date = new Date();

  // Аватары
  selectedAvatar: string = '';
  isCustomAvatar: boolean = false;
  customAvatarFile: File | null = null;

  // Коллекция дефолтных аватаров
  defaultAvatars: string[] = [
    'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/image/public-images/paketoshka/%D0%B1%D0%B0%D0%BD%D1%82%D0%B8%D0%BA.png',
    'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/image/public-images/paketoshka/%D0%B2%20%D1%88%D0%BB%D1%8F%D0%BF%D0%BA%D0%B5.png',
    'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/image/public-images/paketoshka/%D1%83%D1%81%D1%8B.png',
    'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/image/public-images/paketoshka/%D1%86%D0%B8%D0%BB%D0%B8%D0%BD%D0%B4%D1%80.png',
    'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/image/public-images/paketoshka/%D0%B8%D0%BA%D0%BE%D0%BD%D0%BA%D0%B04.png',
    'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/image/public-images/paketoshka/%D0%B8%D0%BA%D0%BE%D0%BD%D0%BA%D0%B03.png',
    'https://xn--80ajjteep7bg.xn--80akonecy.xn--p1ai/image/public-images/paketoshka/%D0%B8%D0%BA%D0%BE%D0%BD%D0%BA%D0%B01.png'
  ];

  popularAvatars: string[] = this.defaultAvatars.slice(0, 6);
  allAvatars: string[] = this.defaultAvatars;

  private originalFormValue: any = {};
  private originalAvatar: string = '';

  private fb = inject(FormBuilder);
  private userService = inject(UserService);
  private userApiService = inject(UserApiService);

  ngOnInit(): void {
    this.initializeForm();
    this.subscribeToUserData();
    this.setupFormValidation();
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      avatar: [''],
      lastName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/)
      ]],
      firstName: ['', [
        Validators.required,
        Validators.minLength(2),
        Validators.pattern(/^[a-zA-Zа-яА-ЯёЁ\s\-]+$/)
      ]],
      middleName: ['', [
        Validators.pattern(/^[a-zA-Zа-яА-ЯёЁ\s\-]*$/)
      ]],
      birthday: ['', [
        this.dateValidator(),
        this.ageValidator(this.minAge)
      ]],
      phoneNumber: ['', [
        Validators.required,
        this.phoneValidator()
      ]],
      email: ['', [
        Validators.required,
        Validators.email
      ]],
    });
  }

  private phoneValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) {
        return { required: true };
      }

      // Убираем все нецифровые символы
      const digits = value.replace(/\D/g, '');

      // Проверяем длину (ровно 10 цифр)
      if (digits.length !== 10) {
        return { phoneLength: 'Номер должен содержать 10 цифр' };
      }

      // Проверяем, что номер НЕ начинается с 7 (код страны)
      if (digits.startsWith('7')) {
        return { phoneStart: 'Номер не должен начинаться с 7' };
      }

      return null;
    };
  }

  // Пользователь вводит только 10 цифр номера (без +7 и без начальной 7)
  onPhoneInput(event: any): void {
    const input = event.target as HTMLInputElement;
    let value = input.value;

    // Удаляем все нецифровые символы
    let digits = value.replace(/\D/g, '');

    // Заменяем 7 на 9 если 7 стоит в начале
    if (digits.startsWith('7')) {
      digits = '9' + digits.slice(1);
    }

    // Ограничиваем длину (ровно 10 цифр)
    digits = digits.slice(0, 10);

    // Форматируем номер без +7
    let formattedValue = '';
    if (digits.length > 0) {
      // Первые 3 цифры - код города
      if (digits.length >= 3) {
        formattedValue = `(${digits.slice(0, 3)}`;
      } else {
        formattedValue = `(${digits}`;
      }

      // Следующие 3 цифры
      if (digits.length >= 6) {
        formattedValue += `) ${digits.slice(3, 6)}`;
      } else if (digits.length > 3) {
        formattedValue += `) ${digits.slice(3)}`;
      }

      // Последние 4 цифры
      if (digits.length >= 8) {
        formattedValue += `-${digits.slice(6, 8)}`;
        if (digits.length >= 10) {
          formattedValue += `-${digits.slice(8, 10)}`;
        } else if (digits.length > 8) {
          formattedValue += `-${digits.slice(8)}`;
        }
      } else if (digits.length > 6) {
        formattedValue += `-${digits.slice(6)}`;
      }
    }

    // Обновляем значение в input
    input.value = formattedValue;

    // Обновляем значение в форме (сохраняем только цифры)
    this.userForm.patchValue({ phoneNumber: digits }, { emitEvent: false });
    this.userForm.get('phoneNumber')?.updateValueAndValidity();
  }

  // Метод для блокировки ввода
  onPhoneKeyDown(event: KeyboardEvent): void {
    const input = event.target as HTMLInputElement;
    const cursorPosition = input.selectionStart || 0;
    const currentValue = input.value;

    // Если курсор в начале и пытаются ввести 7 - блокируем
    if (event.key === '7' && cursorPosition === 0) {
      event.preventDefault();
      return;
    }

    // Разрешаем только цифры, Backspace, Delete, стрелки, Tab
    if (
      event.key.length === 1 &&
      !/[\d]/.test(event.key) &&
      !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'].includes(event.key)
    ) {
      event.preventDefault();
      return;
    }
  }

  // Метод для обработки вставки из буфера обмена
  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboardData = event.clipboardData?.getData('text') || '';

    // Очищаем от всех нецифровых символов
    let digits = clipboardData.replace(/\D/g, '');

    // Убираем код страны если он есть в начале
    if (digits.startsWith('7') || digits.startsWith('8')) {
      digits = digits.slice(1);
    }

    // Ограничиваем длину (только 10 цифр без кода страны)
    digits = digits.slice(-10); // Берем последние 10 цифр

    // Форматируем
    let formattedValue = '';
    if (digits.length > 0) {
      if (digits.length >= 3) {
        formattedValue = `(${digits.slice(0, 3)}`;
      } else {
        formattedValue = `(${digits}`;
      }

      if (digits.length >= 6) {
        formattedValue += `) ${digits.slice(3, 6)}`;
      } else if (digits.length > 3) {
        formattedValue += `) ${digits.slice(3)}`;
      }

      if (digits.length >= 8) {
        formattedValue += `-${digits.slice(6, 8)}`;
        if (digits.length >= 10) {
          formattedValue += `-${digits.slice(8, 10)}`;
        }
      } else if (digits.length > 6) {
        formattedValue += `-${digits.slice(6)}`;
      }
    }

    // Вставляем отформатированное значение
    const input = event.target as HTMLInputElement;
    input.value = formattedValue;

    // Обновляем форму
    this.userForm.patchValue({ phoneNumber: digits }, { emitEvent: false });
    this.userForm.get('phoneNumber')?.updateValueAndValidity();
  }

  // Метод для инициализации телефона из данных пользователя
  private formatPhoneForInput(phone: string): string {
    if (!phone) return '';

    // Убираем все нецифровые символы
    let digits = phone.replace(/\D/g, '');

    // Убираем код страны (+7 или 7 или 8)
    if (digits.startsWith('7') || digits.startsWith('8')) {
      digits = digits.slice(1);
    }

    // Берем последние 10 цифр
    digits = digits.slice(-10);

    // Форматируем без +7
    let formattedValue = '';
    if (digits.length > 0) {
      if (digits.length >= 3) {
        formattedValue = `(${digits.slice(0, 3)}`;
      } else {
        formattedValue = `(${digits}`;
      }

      if (digits.length >= 6) {
        formattedValue += `) ${digits.slice(3, 6)}`;
      } else if (digits.length > 3) {
        formattedValue += `) ${digits.slice(3)}`;
      }

      if (digits.length >= 8) {
        formattedValue += `-${digits.slice(6, 8)}`;
        if (digits.length >= 10) {
          formattedValue += `-${digits.slice(8, 10)}`;
        }
      } else if (digits.length > 6) {
        formattedValue += `-${digits.slice(6)}`;
      }
    }

    return formattedValue;
  }

  // Новая функция для подготовки телефона для формы
  private formatPhoneForForm(phone: string): string {
    if (!phone) return '';

    // Убираем все нецифровые символы
    let digits = phone.replace(/\D/g, '');

    // Убираем код страны
    if (digits.startsWith('7') || digits.startsWith('8')) {
      digits = digits.slice(1);
    }

    // Берем только 10 цифр
    return digits.slice(-10);
  }

  // При фокусе на поле - ничего не делаем, не добавляем +7
  onPhoneFocus(event: FocusEvent): void {
    const input = event.target as HTMLInputElement;

    // Если поле пустое, оставляем пустым
    if (!input.value) {
      return;
    }

    // Если есть значение, просто выделяем весь текст для удобства
    setTimeout(() => {
      input.select();
    }, 0);
  }

  private subscribeToUserData(): void {
    this.userService.user$.subscribe((user: any) => {
      if (user) {
        const formData = {
          avatar: user.avatarUrl || '',
          lastName: user.lastName || '',
          firstName: user.firstName || '',
          middleName: user.middleName || '',
          birthday: this.formatDateForInput(user.birthday) || '',
          phoneNumber: this.formatPhoneForForm(user.phoneNumber) || '', // Используем новую функцию
          email: user.email || '',
        };

        this.userForm.patchValue(formData, { emitEvent: false });
        this.originalFormValue = { ...formData };
        this.originalAvatar = user.avatarUrl || '';
        this.selectedAvatar = user.avatarUrl || '';
        this.isCustomAvatar = this.isCustomImage(user.avatarUrl);
        this.userForm.markAsPristine();
      }
    });
  }


  private setupFormValidation(): void {
    this.userForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        Object.keys(this.userForm.controls).forEach(key => {
          const control = this.userForm.get(key);
          control?.updateValueAndValidity({ onlySelf: true });
        });
      });
  }

  private dateValidator() {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const date = new Date(value);
      const today = new Date();

      if (isNaN(date.getTime())) {
        return { dateInvalid: true };
      }

      if (date > today) {
        return { dateFuture: true };
      }

      return null;
    };
  }

  private ageValidator(minAge: number) {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) return null;

      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age < minAge ? { minAge: true } : null;
    };
  }

  private formatDateForInput(dateString: string): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    return date.toISOString().split('T')[0];
  }

  // Методы для аватаров
  private isCustomImage(url: string): boolean {
    if (!url) return false;

    // Проверяем, является ли URL дефолтным аватаром
    const isDefaultAvatar = this.defaultAvatars.some(defaultUrl =>
      url.includes(defaultUrl) || url === defaultUrl
    );

    // Проверяем, является ли это data URL (загруженное изображение)
    const isDataUrl = url.startsWith('data:image/');

    return !isDefaultAvatar && (isDataUrl || url.includes('/api/Profile/Avatar'));
  }

  // Обновите метод getFieldError
  getFieldError(fieldName: string): string {
    const control = this.userForm.get(fieldName);
    if (!control?.errors || !control.touched) return '';

    const errors = control.errors;

    switch (fieldName) {
      case 'lastName':
      case 'firstName':
        if (errors['required']) return 'Это поле обязательно';
        if (errors['minlength']) return `Минимум ${errors['minlength'].requiredLength} символа`;
        if (errors['pattern']) return 'Только буквы и дефисы';
        break;
      case 'phoneNumber':
        if (errors['required']) return 'Телефон обязателен';
        if (errors['phoneLength']) return errors['phoneLength'];
        break;
      case 'email':
        if (errors['required']) return 'Email обязателен';
        if (errors['email']) return 'Некорректный email';
        break;
      case 'birthday':
        if (errors['dateInvalid']) return 'Неверная дата';
        if (errors['minAge']) return `Минимальный возраст - ${this.minAge} лет`;
        if (errors['dateFuture']) return 'Дата не может быть в будущем';
        break;
    }

    return 'Неверное значение';
  }

  // Обновите prepareFormData для телефона
  private prepareFormData(): any {
    const formValue = this.userForm.value;

    if (formValue.birthday) {
      formValue.birthday = new Date(formValue.birthday).toISOString();
    }

    // Для телефона добавляем +7 перед 10 цифрами
    if (formValue.phoneNumber && formValue.phoneNumber.length === 10) {
      formValue.phoneNumber = '+7' + formValue.phoneNumber;
    }

    // Для дефолтных аватаров отправляем URL
    // Для кастомных аватаров не отправляем avatar в этом запросе (уже загружены отдельно)
    if (this.isCustomAvatar && this.customAvatarFile) {
      delete formValue.avatar;
    }

    // Убираем пустые значения
    const cleanedData: any = {};
    Object.keys(formValue).forEach(key => {
      if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
        cleanedData[key] = formValue[key];
      }
    });

    return cleanedData;
  }

  // Остальные методы остаются без изменений...
  openAvatarModal(): void {
    this.showAvatarModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeAvatarModal(): void {
    if (this.selectedAvatar !== this.userForm.get('avatar')?.value) {
      this.selectedAvatar = this.userForm.get('avatar')?.value || this.originalAvatar;
      this.isCustomAvatar = this.isCustomImage(this.selectedAvatar);
      this.customAvatarFile = null;
    }

    this.showAvatarModal = false;
    document.body.style.overflow = '';
  }

  selectQuickAvatar(avatarUrl: string): void {
    this.selectedAvatar = avatarUrl;
    this.isCustomAvatar = false;
    this.customAvatarFile = null;

    this.userForm.patchValue({ avatar: avatarUrl });
    this.userForm.markAsDirty();

    this.showNotification('Аватар выбран!', 'success');
  }

  selectDefaultAvatar(avatarUrl: string): void {
    this.selectedAvatar = avatarUrl;
    this.isCustomAvatar = false;
    this.customAvatarFile = null;
  }

  applySelectedAvatar(): void {
    if (this.selectedAvatar) {
      if (this.isCustomAvatar && this.customAvatarFile) {
        this.uploadCustomAvatar();
      } else {
        this.userForm.patchValue({ avatar: this.selectedAvatar });
        this.userForm.markAsDirty();
        this.closeAvatarModal();
        this.showNotification('Аватар успешно применен!', 'success');
      }
    }
  }

  private uploadCustomAvatar(): void {
    if (!this.customAvatarFile) {
      this.showNotification('Ошибка: файл не найден', 'error');
      return;
    }

    this.avatarLoading = true;

    const formData = new FormData();
    formData.append('avatar', this.customAvatarFile, this.customAvatarFile.name);

    this.userApiService.updateAvatar(formData).subscribe({
      next: (res: any) => {
        this.avatarLoading = false;

        if (res.data && res.data.avatarUrl) {
          this.selectedAvatar = res.data.avatarUrl;
          this.userForm.patchValue({ avatar: res.data.avatarUrl });
          this.originalAvatar = res.data.avatarUrl;
          this.isCustomAvatar = this.isCustomImage(res.data.avatarUrl);
          this.userForm.markAsDirty();

          this.userService.setUser(res.data, 'session', true);

          this.closeAvatarModal();
          this.showNotification('Аватар успешно загружен!', 'success');
        }

        this.customAvatarFile = null;
      },
      error: (err: any) => {
        this.avatarLoading = false;
        this.showNotification(err.error?.message || 'Ошибка при загрузке аватара', 'error');
        this.customAvatarFile = null;
      }
    });
  }

  onAvatarUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.match('image.*')) {
      this.showNotification('Пожалуйста, выберите изображение', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.showNotification('Изображение должно быть меньше 5MB', 'error');
      return;
    }

    this.customAvatarFile = file;
    this.isCustomAvatar = true;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const customAvatar = e.target.result;
      this.selectedAvatar = customAvatar;
    };

    reader.onerror = () => {
      this.customAvatarFile = null;
      this.isCustomAvatar = false;
      this.showNotification('Ошибка при загрузке изображения', 'error');
    };

    reader.readAsDataURL(file);
  }

  // Drag & Drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      const uploadEvent = { target: { files: [file] } };
      this.onAvatarUpload(uploadEvent);
    }
  }

  getCompletionPercentage(): number {
    const requiredFields = ['lastName', 'firstName', 'phoneNumber', 'email'];
    const optionalFields = ['middleName', 'birthday', 'avatar'];

    let completed = 0;
    let totalWeight = 0;

    requiredFields.forEach(field => {
      totalWeight += 1;
      if (this.userForm.get(field)?.value && this.userForm.get(field)?.valid) {
        completed += 1;
      }
    });

    optionalFields.forEach(field => {
      totalWeight += 0.5;
      if (this.userForm.get(field)?.value) {
        completed += 0.5;
      }
    });

    const percentage = (completed / totalWeight) * 100;
    return Math.min(100, Math.round(percentage));
  }

  onSubmit(): void {
    if ((this.userForm.valid && this.userForm.dirty) || (this.isCustomAvatar && this.customAvatarFile)) {
      this.isSubmitting = true;

      if (this.isCustomAvatar && this.customAvatarFile) {
        this.saveCustomAvatarAndProfile();
      } else {
        this.saveProfileData();
      }
    } else {
      this.userForm.markAllAsTouched();
      this.scrollToFirstInvalidControl();
    }
  }

  private saveCustomAvatarAndProfile(): void {
    if (!this.customAvatarFile) {
      this.saveProfileData();
      return;
    }

    const formData = new FormData();
    formData.append('avatar', this.customAvatarFile, this.customAvatarFile.name);

    this.userApiService.updateAvatar(formData).subscribe({
      next: (res: any) => {
        if (res.data && res.data.avatarUrl) {
          this.userForm.patchValue({ avatar: res.data.avatarUrl });
          this.originalAvatar = res.data.avatarUrl;
          this.isCustomAvatar = this.isCustomImage(res.data.avatarUrl);

          this.userService.setUser(res.data, 'session', true);
        }

        this.saveProfileData();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Ошибка при загрузке аватара';
        setTimeout(() => this.errorMessage = '', 5000);
      }
    });
  }

  private saveProfileData(): void {
    const formData = this.prepareFormData();

    formData.avatarImageLink = formData.avatar;
    delete formData.avatar;
    
    this.userApiService.updateData(formData).subscribe({
      next: (res: any) => {
        this.isSubmitting = false;
        this.successMessage = 'Профиль успешно обновлен';
        this.lastSaved = new Date();

        if (res.data) {
          this.userService.setUser(res.data, 'session', true);
          this.originalFormValue = { ...this.userForm.value };
          this.originalAvatar = res.data.avatarUrl || '';
          this.customAvatarFile = null;
          this.userForm.markAsPristine();
        }

        setTimeout(() => {
          this.successMessage = '';
        }, 5000);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Ошибка при обновлении профиля';

        setTimeout(() => {
          this.errorMessage = '';
        }, 5000);
      }
    });
  }

  resetForm(): void {
    this.userForm.patchValue(this.originalFormValue);
    this.selectedAvatar = this.originalAvatar;
    this.isCustomAvatar = this.isCustomImage(this.originalAvatar);
    this.customAvatarFile = null;
    this.userForm.markAsPristine();
    this.userForm.markAsUntouched();

    if (this.successMessage) this.successMessage = '';
    if (this.errorMessage) this.errorMessage = '';
  }

  private scrollToFirstInvalidControl(): void {
    const firstInvalidControl = document.querySelector('.field-group.has-error');
    if (firstInvalidControl) {
      firstInvalidControl.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }

  showNotification(message: string, type: 'success' | 'error'): void {
    if (type === 'success') {
      this.successMessage = message;
      setTimeout(() => {
        this.successMessage = '';
      }, 5000);
    } else {
      this.errorMessage = message;
      setTimeout(() => {
        this.errorMessage = '';
      }, 5000);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showAvatarModal) {
      this.closeAvatarModal();
    }
  }
}