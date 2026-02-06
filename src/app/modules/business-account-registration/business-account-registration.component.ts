import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { finalize, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

interface BusinessAccountData {
  user: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  company: {
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

@Component({
  selector: 'app-business-account-registration',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, FormsModule],
  templateUrl: './business-account-registration.component.html',
  styleUrls: ['./business-account-registration.component.scss']
})
export class BusinessAccountRegistrationComponent implements OnInit, OnDestroy {
  currentStep = 1;
  totalSteps = 3;
  isLoading = false;
  isSubmitting = false;
  error: string | null = null;
  success = false;
  showHelp = false;
  showPassword = false;
  showConfirmPassword = false;
  uploadMethod: 'single' | 'cloud' | 'archive' = 'single';
  selectedProvider: 'yandex' | 'google' | 'dropbox' | 'other' = 'yandex';
  cloudLink = '';
  archiveFile: File | null = null;
  isDragOver = false;
  
  // Forms
  userForm: FormGroup;
  companyForm: FormGroup;
  
  // Data
  accountData: BusinessAccountData = {
    user: {} as any,
    company: {} as any,
    documents: []
  };
  
  partnerTypes: PartnerType[] = [];
  selectedPartnerType: PartnerType | null = null;
  
  // Company registration date
  companyRegistrationDate: Date | null = null;
  
  // Document types - Updated based on requirements
  documentTypes = [
    // Для ООО
    { id: 1, name: 'Решение единственного учредителя о создании ООО', requiredFor: [1], optionalFor: [] },
    { id: 2, name: 'Протокол собрания участников (если учредителей несколько)', requiredFor: [1], optionalFor: [] },
    { id: 3, name: 'Устав (листы 1, 2, последний, полномочия директора)', requiredFor: [1], optionalFor: [] },
    { id: 4, name: 'Решение о назначении директора', requiredFor: [1], optionalFor: [] },
    { id: 5, name: 'Карточка предприятия', requiredFor: [1, 2], optionalFor: [] },
    { id: 6, name: 'Свидетельство ОГРН (для регистраций до 2017 г.)', requiredFor: [1], optionalFor: [1], condition: 'before2017' },
    { id: 7, name: 'Свидетельство ИНН/КПП (для регистраций до 2017 г.)', requiredFor: [1], optionalFor: [1], condition: 'before2017' },
    { id: 8, name: 'Лист записи ЕГРИП (для регистраций после 2017 г.)', requiredFor: [2], optionalFor: [2], condition: 'after2017' },
    { id: 9, name: 'Свидетельство ОГРНИП (для регистраций до 2017 г.)', requiredFor: [2], optionalFor: [2], condition: 'before2017' },
    { id: 10, name: 'Свидетельство ИНН (для регистраций до 2027 г.)', requiredFor: [2], optionalFor: [2], condition: 'before2027' },
    { id: 11, name: 'Паспорт (разворот с фото и пропиской)', requiredFor: [1, 2], optionalFor: [] }
  ];
  
  // Uploaded files
  uploadedDocuments: DocumentData[] = [];
  
  // Progress tracking
  progress = {
    step1: false,
    step2: false,
    step3: false
  };
  
  // Password strength
  passwordStrength = {
    level: 0,
    hints: [] as { message: string; valid: boolean }[]
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient
  ) {
    this.userForm = this.createUserForm();
    this.companyForm = this.createCompanyForm();
  }

  ngOnInit(): void {
    this.loadPartnerTypes();
    this.setupFormListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      inn: ['', [Validators.required, Validators.pattern(/^\d{10}$|^\d{12}$/)]],
      ogrn: ['', [Validators.required, Validators.pattern(/^\d{13}$|^\d{15}$/)]],
      kpp: ['', this.kppValidator],
      registrationDate: ['', Validators.required],
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
    if (!document.condition || !this.companyRegistrationDate) return true;
    
    const registrationYear = this.companyRegistrationDate.getFullYear();
    const registrationMonth = this.companyRegistrationDate.getMonth();
    
    switch (document.condition) {
      case 'before2017':
        return registrationYear < 2017 || 
              (registrationYear === 2017 && registrationMonth < 0); // Январь 2017
      
      case 'after2017':
        return registrationYear > 2017 || 
              (registrationYear === 2017 && registrationMonth >= 0);
      
      case 'before2027':
        return registrationYear < 2027 || 
              (registrationYear === 2027 && registrationMonth < 0);
      
      default:
        return true;
    }
  }

  getRequiredDocuments(): any[] {
    if (!this.selectedPartnerType || !this.companyRegistrationDate) return [];
    
    return this.documentTypes.filter(doc => {
      const isForPartnerType = doc.requiredFor.includes(this.selectedPartnerType!.code);
      const hasCondition = doc.condition;
      
      if (!isForPartnerType) return false;
      
      if (hasCondition) {
        return this.checkDocumentCondition(doc);
      }
      
      return true;
    });
  }

  getOptionalDocuments(): any[] {
    if (!this.selectedPartnerType) return [];
    
    return this.documentTypes.filter(doc => {
      const isForPartnerType = doc.optionalFor.includes(this.selectedPartnerType!.code);
      
      if (!isForPartnerType) return false;
      
      if (doc.condition) {
        return this.checkDocumentCondition(doc);
      }
      
      return true;
    });
  }

  // Progress methods
  getProgressPercentage(): number {
    let progress = 0;
    if (this.progress.step1) progress += 33;
    if (this.progress.step2) progress += 33;
    if (this.progress.step3) progress += 34;
    return progress;
  }

  // Step navigation
  nextStep(): void {
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

  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.scrollToTop();
    }
  }

  goToStep(step: number): void {
    if (step >= 1 && step <= this.totalSteps && step <= this.currentStep) {
      this.currentStep = step;
      this.scrollToTop();
    }
  }

  validateCurrentStep(): boolean {
    switch (this.currentStep) {
      case 1:
        return this.userForm.valid;
      case 2:
        return this.companyForm.valid;
      case 3:
        return this.validateDocumentsStep();
      default:
        return true;
    }
  }

  validateDocumentsStep(): boolean {
    if (!this.selectedPartnerType || !this.companyRegistrationDate) return false;
    
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
        Object.values(this.userForm.controls).forEach(control => {
          control.markAsTouched();
        });
        break;
      case 2:
        this.companyForm.markAllAsTouched();
        break;
    }
  }

  private saveCurrentStepData(): void {
    switch (this.currentStep) {
      case 1:
        this.accountData.user = this.userForm.value;
        this.progress.step1 = true;
        break;
      case 2:
        this.accountData.company = {
          ...this.companyForm.value,
          registrationDate: this.companyRegistrationDate
        };
        this.progress.step2 = true;
        break;
      case 3:
        this.progress.step3 = true;
        break;
    }
  }

  // UI Helpers
  getCurrentStepTitle(): string {
    switch(this.currentStep) {
      case 1: return 'Создание пользователя';
      case 2: return 'Информация о компании';
      case 3: return 'Загрузка документов';
      default: return '';
    }
  }

  getStepTitle(step: number): string {
    switch(step) {
      case 1: return 'Пользователь';
      case 2: return 'Компания';
      case 3: return 'Документы';
      default: return `Шаг ${step}`;
    }
  }

  getStepSubtitle(step: number): string {
    switch(step) {
      case 1: return 'Контактные данные';
      case 2: return 'Реквизиты организации';
      case 3: return 'Верификация';
      default: return '';
    }
  }

  getStepStatus(step: number): string {
    if (this.currentStep === step) return 'active';
    if (step === 1 && this.progress.step1) return 'completed';
    if (step === 2 && this.progress.step2) return 'completed';
    if (step === 3 && this.progress.step3) return 'completed';
    return 'pending';
  }

  getStepGuideText(): string {
    switch(this.currentStep) {
      case 1: return 'Заполните все поля для создания учетной записи';
      case 2: return 'Укажите точные данные вашей компании';
      case 3: return 'Загрузите необходимые документы одним из способов';
      default: return '';
    }
  }

  getStepHint(): string {
    switch(this.currentStep) {
      case 1: return 'Используйте надежный пароль с буквами, цифрами и символами';
      case 2: return 'Данные должны совпадать с юридическими документами';
      case 3: return 'Рекомендуем загружать документы поштучно для лучшего контроля';
      default: return '';
    }
  }

  getCurrentStepHelp(): string {
    switch(this.currentStep) {
      case 1: return 'Заполните точные контактные данные. Это важно для восстановления доступа и получения уведомлений.';
      case 2: return 'Убедитесь, что юридические данные совпадают с документами. Это ускорит проверку.';
      case 3: return 'Выберите удобный способ загрузки документов. Поштучная загрузка позволяет контролировать каждый файл.';
      default: return '';
    }
  }

  // Help methods
  toggleHelp(): void {
    this.showHelp = !this.showHelp;
  }

  // Form field helpers
  getEmailErrorMessage(): string {
    const errors = this.userForm.get('email')?.errors;
    if (errors?.['required']) return 'Введите email';
    if (errors?.['email']) return 'Неверный формат email';
    return '';
  }

  // Password methods
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
    
    // Length check
    if (password.length >= 8) {
      level++;
      this.passwordStrength.hints.push({
        message: 'Не менее 8 символов',
        valid: true
      });
    } else {
      this.passwordStrength.hints.push({
        message: 'Не менее 8 символов',
        valid: false
      });
    }

    // Letter check
    if (/[A-Za-z]/.test(password)) {
      level++;
      this.passwordStrength.hints.push({
        message: 'Содержит буквы',
        valid: true
      });
    } else {
      this.passwordStrength.hints.push({
        message: 'Содержит буквы',
        valid: false
      });
    }

    // Digit check
    if (/\d/.test(password)) {
      level++;
      this.passwordStrength.hints.push({
        message: 'Содержит цифры',
        valid: true
      });
    } else {
      this.passwordStrength.hints.push({
        message: 'Содержит цифры',
        valid: false
      });
    }

    // Special character check
    if (/[^A-Za-z0-9]/.test(password)) {
      level++;
      this.passwordStrength.hints.push({
        message: 'Содержит спецсимволы',
        valid: true
      });
    } else {
      this.passwordStrength.hints.push({
        message: 'Содержит спецсимволы',
        valid: false
      });
    }

    // Mixed case check
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
      level++;
      this.passwordStrength.hints.push({
        message: 'Смешанный регистр',
        valid: true
      });
    } else {
      this.passwordStrength.hints.push({
        message: 'Смешанный регистр',
        valid: false
      });
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
    
    if (this.passwordsMatch()) {
      return 'Пароли совпадают';
    } else {
      return 'Пароли не совпадают';
    }
  }

  // Company methods
  selectPartnerType(type: PartnerType): void {
    this.selectedPartnerType = type;
    this.companyForm.patchValue({
      partnerTypeId: type.id
    });
  }

  getFullNamePlaceholder(): string {
    if (this.selectedPartnerType?.code === 1) {
      return 'Общество с ограниченной ответственностью "Ромашка"';
    } else {
      return 'Индивидуальный предприниматель Иванов Иван Иванович';
    }
  }

  getShortNamePlaceholder(): string {
    if (this.selectedPartnerType?.code === 1) {
      return 'ООО "Ромашка"';
    } else {
      return 'ИП Иванов И.И.';
    }
  }

  getOgrnPlaceholder(): string {
    if (this.selectedPartnerType?.code === 1) {
      return '13 цифр';
    } else {
      return '15 цифр';
    }
  }

  // File handling methods
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
  }

  removeDocument(documentTypeId: number): void {
    this.uploadedDocuments = this.uploadedDocuments.filter(doc => doc.type !== documentTypeId);
    this.accountData.documents = this.uploadedDocuments;
  }

  getDocumentName(typeId: number): string {
    const docType = this.documentTypes.find(doc => doc.id === typeId);
    return docType?.name || `Документ ${typeId}`;
  }

  getUploadedDocument(typeId: number): DocumentData | undefined {
    return this.uploadedDocuments.find(doc => doc.type === typeId);
  }

  // Document checklist methods
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
    input.onchange = (e: any) => {
      this.onFileSelected(e, docId);
    };
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

  // Cloud storage methods
  validateCloudLink(): void {
    if (!this.cloudLink) {
      this.error = 'Введите ссылку на облачное хранилище';
      return;
    }

    if (!this.cloudLink.startsWith('http')) {
      this.error = 'Ссылка должна начинаться с http:// или https://';
      return;
    }

    console.log('Validating cloud link:', this.cloudLink);
    this.error = null;
  }

  // Archive methods
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
  }

  removeArchive(): void {
    this.archiveFile = null;
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
  }

  // Utility methods
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

  // Success state methods
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

  // Submission
  submitBusinessAccount(): void {
    if (!this.validateDocumentsStep()) {
      this.error = 'Пожалуйста, завершите загрузку документов';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    const formData = new FormData();

    formData.append('user', JSON.stringify(this.accountData.user));
    formData.append('company', JSON.stringify(this.accountData.company));

    if (this.uploadMethod === 'single') {
      this.accountData.documents.forEach((doc, index) => {
        formData.append(`documents[${index}].type`, doc.type.toString());
        formData.append(`documents[${index}].file`, doc.file, doc.fileName);
      });
    } else if (this.uploadMethod === 'cloud') {
      formData.append('cloudLink', this.cloudLink);
      formData.append('cloudProvider', this.selectedProvider);
    } else if (this.uploadMethod === 'archive' && this.archiveFile) {
      formData.append('archive', this.archiveFile, this.archiveFile.name);
    }

    formData.append('uploadMethod', this.uploadMethod);

    const apiUrl = '/api/business-account/register';

    this.http.post(apiUrl, formData)
      .pipe(
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (response: any) => {
          this.success = true;
          this.progress.step3 = true;
          
          setTimeout(() => {
            this.resetAllForms();
          }, 3000);
        },
        error: (err) => {
          this.error = err.error?.message || 'Произошла ошибка при регистрации. Попробуйте еще раз.';
          console.error('Registration error:', err);
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
    this.accountData = {
      user: {} as any,
      company: {} as any,
      documents: []
    };
    this.cloudLink = '';
    this.archiveFile = null;
    this.uploadMethod = 'single';
    this.passwordStrength = { level: 0, hints: [] };
  }

  canSubmitDocuments(): boolean {
    return this.validateDocumentsStep();
  }
}