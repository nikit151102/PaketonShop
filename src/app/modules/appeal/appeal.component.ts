import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RequesterType, RequestType, CreateAppealDto } from '../../core/interfaces/hotline.interface';
import { HotlineService } from '../../core/services/hotline.service';

@Component({
  selector: 'app-appeal',
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './appeal.component.html',
  styleUrl: './appeal.component.scss',
    animations: [
    trigger('fadeIn', [
      transition(':enter', [style({ opacity: 0 }), animate('300ms ease-out', style({ opacity: 1 }))])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('toastAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [animate('200ms ease-in', style({ opacity: 0 }))])
    ])
  ]
})
export class AppealComponent  implements OnInit, OnDestroy {
  // Состояние формы
  currentStep = 1;
  progress = 33;
  isSubmitting = false;
  appealId: string | null = null;
  
  // Данные
  requesterTypes: RequesterType[] = [];
  requestTypes: RequestType[] = [];
  selectedRequester: RequesterType | null = null;
  selectedFiles: File[] = [];
  isDragOver = false;
  
  // Загрузка
  loadingRequesters = true;
  loadingRequestTypes = false;
  
  // Уведомления
  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';
  
  // Форма
  appealForm: FormGroup;
  
  private destroy$ = new Subject<void>();
  
  // По умолчанию channel_id (можно получить из роута или auth)
  private readonly defaultChannelId = '00000000-0000-0000-0000-000000000000';

  constructor(
    private hotlineService: HotlineService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.appealForm = this.fb.group({
      message_content: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
      consent: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    this.loadRequesterTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Геттеры
  get messageControl() { return this.appealForm.get('message_content'); }
  get consentControl() { return this.appealForm.get('consent'); }

  // Загрузка типов заявителей
  private loadRequesterTypes(): void {
    this.loadingRequesters = true;
    
    this.hotlineService.getRequesterTypes().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (types) => {
        this.requesterTypes = types;
        this.loadingRequesters = false;
      },
      error: (err) => {
        console.error('Ошибка загрузки типов заявителей:', err);
        this.showToast('Не удалось загрузить данные. Попробуйте позже.', 'error');
        this.loadingRequesters = false;
      }
    });
  }

  // Выбор типа заявителя
  selectRequesterType(type: RequesterType): void {
    this.formData.requester_type_id = type.id;
    this.selectedRequester = type;
    
    // Загружаем доступные типы обращений
    this.loadRequestTypes(type.code);
    
    // Переход на следующий шаг
    this.nextStep();
  }

  // Загрузка типов обращений
  private loadRequestTypes(requesterCode: string): void {
    this.loadingRequestTypes = true;
    
    this.hotlineService.getAvailableRequestTypes(requesterCode).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (types) => {
        this.requestTypes = types;
        this.loadingRequestTypes = false;
        
        if (types.length === 0) {
          this.showToast('Для этой категории пока нет доступных типов обращений', 'error');
        }
      },
      error: (err) => {
        console.error('Ошибка загрузки типов обращений:', err);
        this.showToast('Не удалось загрузить типы обращений', 'error');
        this.loadingRequestTypes = false;
      }
    });
  }

  // Обработчик выбора типа обращения
  onRequestTypeChange(type: RequestType): void {
    // Можно добавить дополнительную логику
    console.log('Выбран тип обращения:', type);
      setTimeout(() => {
    this.nextStep();
  }, 150);
  }

  // Навигация по шагам
  nextStep(): void {
    if (this.currentStep < 3) {
      this.currentStep++;
      this.updateProgress();
    }
  }

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.updateProgress();
    }
  }

  private updateProgress(): void {
    this.progress = this.currentStep * 33;
  }

  // Работа с файлами
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
    if (files?.length) {
      this.handleFiles(Array.from(files));
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFiles(Array.from(input.files));
      input.value = ''; // сброс для повторного выбора
    }
  }

  private handleFiles(files: File[]): void {
    const maxSize = 10 * 1024 * 1024; // 10 MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    for (const file of files) {
      if (file.size > maxSize) {
        this.showToast(`Файл "${file.name}" превышает 10 МБ`, 'error');
        continue;
      }
      if (!allowedTypes.includes(file.type)) {
        this.showToast(`Формат "${file.type}" не поддерживается`, 'error');
        continue;
      }
      this.selectedFiles.push(file);
    }
    
    if (this.selectedFiles.length) {
      this.showToast(`Добавлено файлов: ${this.selectedFiles.length}`, 'success');
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Отправка формы
async submitAppeal(): Promise<void> {
  // 🔹 Валидация
  if (this.appealForm.invalid || !this.formData.requester_type_id || !this.formData.request_type_id) {
    this.showToast('Пожалуйста, заполните все обязательные поля', 'error');
    return;
  }

  this.isSubmitting = true;

  // 🔹 ПРАВИЛЬНО: берём message_content из FormGroup
  const appealData: CreateAppealDto = {
    channel_id: this.defaultChannelId,
    requester_type_id: this.formData.requester_type_id!,  // из свойств компонента
    request_type_id: this.formData.request_type_id!,        // из свойств компонента  
    message_content: this.appealForm.value.message_content, // 🔹 ИЗ FORM VALUE!
    acceptance_info: 'Обращение из веб-интерфейса',
    administrator: 'Web User'
  };

  console.log('📤 Отправка обращения:', appealData); // 🔹 Дебаг

  try {
    const response = await this.hotlineService.createAppeal(appealData).toPromise();
    
    this.appealId = response?.data?.id || 'N/A';
    this.currentStep = 4;
    this.showToast('Обращение успешно отправлено!', 'success');
    
  } catch (error: any) {
    console.error('❌ Ошибка отправки:', error);
    this.showToast(error.message || 'Не удалось отправить обращение', 'error');
  } finally {
    this.isSubmitting = false;
  }
}

  // Сброс формы
  resetForm(): void {
    this.currentStep = 1;
    this.progress = 33;
    this.appealForm.reset({ consent: false });
    this.selectedFiles = [];
    this.appealId = null;
    this.selectedRequester = null;
    
    // Очищаем formData
    Object.assign(this.formData, {
      requester_type_id: null,
      request_type_id: null,
      message_content: ''
    });
    
    // Перезагружаем данные
    this.loadRequesterTypes();
  }

  goToHome(): void {
    this.router.navigate(['/']);
  }

  // Вспомогательные
  get formData(): any {
    // Можно вынести в отдельный интерфейс FormData
    return this;
  }

  showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
    
    setTimeout(() => {
      this.toastMessage = null;
    }, 4000);
  }
}
