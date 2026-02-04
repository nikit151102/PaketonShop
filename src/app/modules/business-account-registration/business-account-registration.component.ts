import { Component, OnInit, OnDestroy } from '@angular/core';
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
  
  // Document types based on OrderDocumentTypeEnum
  documentTypes = [
    { id: 1, name: 'Решение о создании ООО', requiredFor: [1] },
    { id: 2, name: 'Устав (листы 1,2, последний, полномочия директора)', requiredFor: [1] },
    { id: 3, name: 'Решение о назначении директора', requiredFor: [1] },
    { id: 4, name: 'Приказ на директора', requiredFor: [1] },
    { id: 5, name: 'Карточка предприятия', requiredFor: [1, 2] },
    { id: 6, name: 'Свидетельство ОГРН', requiredFor: [1] },
    { id: 7, name: 'Свидетельство ИНН/КПП', requiredFor: [1] },
    { id: 8, name: 'Свидетельство о гос.регистрации (ОГРНИП)', requiredFor: [2] },
    { id: 9, name: 'Паспорт (разворот с фото и пропиской)', requiredFor: [2] }
  ];
  
  // Uploaded files
  uploadedDocuments: DocumentData[] = [];
  
  // Progress tracking
  progress = {
    step1: false,
    step2: false,
    step3: false
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

  // Validators
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
    // TODO: Load partner types from API
    setTimeout(() => {
      this.partnerTypes = [
        { id: '1', code: 1, fullName: 'Общество с ограниченной ответственностью', shortName: 'ООО' },
        { id: '2', code: 2, fullName: 'Индивидуальный предприниматель', shortName: 'ИП' }
      ];
      this.isLoading = false;
    }, 500);
  }

  private setupFormListeners(): void {
    // Listen to partner type changes
    this.companyForm.get('partnerTypeId')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        const type = this.partnerTypes.find(t => t.id === value);
        this.selectedPartnerType = type || null;
        this.updateKppValidation();
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
      this.updateProgress();
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

  private validateDocumentsStep(): boolean {
    if (!this.selectedPartnerType) return false;
    
    const requiredDocs = this.documentTypes.filter(doc => 
      doc.requiredFor.includes(this.selectedPartnerType!.code)
    );
    
    return requiredDocs.every(requiredDoc => 
      this.uploadedDocuments.some(doc => doc.type === requiredDoc.id)
    );
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
        this.accountData.company = this.companyForm.value;
        this.progress.step2 = true;
        break;
    }
  }

  private updateProgress(): void {
    // Progress is already updated in saveCurrentStepData
  }

  // File handling
  onFileSelected(event: Event, documentTypeId: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      this.error = 'Разрешены только файлы PDF, JPEG и PNG';
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      this.error = 'Файл слишком большой. Максимальный размер 10MB';
      return;
    }

    // Create document data
    const document: DocumentData = {
      type: documentTypeId,
      file: file,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    };

    // Check if document type already exists
    const existingIndex = this.uploadedDocuments.findIndex(doc => doc.type === documentTypeId);
    
    if (existingIndex >= 0) {
      // Replace existing document
      this.uploadedDocuments[existingIndex] = document;
    } else {
      // Add new document
      this.uploadedDocuments.push(document);
    }

    // Update account data
    this.accountData.documents = this.uploadedDocuments;
    
    // Clear file input
    input.value = '';
    
    // Clear any previous errors
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

  getFileIcon(fileType: string): string {
    if (fileType === 'application/pdf') return '📄';
    if (fileType.includes('image/')) return '🖼️';
    return '📎';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Submission
  submitBusinessAccount(): void {
    if (!this.validateDocumentsStep()) {
      this.error = 'Пожалуйста, загрузите все необходимые документы';
      return;
    }

    this.isSubmitting = true;
    this.error = null;

    // Prepare form data
    const formData = new FormData();

    // Add user data
    formData.append('user', JSON.stringify(this.accountData.user));

    // Add company data
    formData.append('company', JSON.stringify(this.accountData.company));

    // Add documents
    this.accountData.documents.forEach((doc, index) => {
      formData.append(`documents[${index}].type`, doc.type.toString());
      formData.append(`documents[${index}].file`, doc.file, doc.fileName);
    });

    // TODO: Replace with actual API endpoint
    const apiUrl = '/api/business-account/register';

    this.http.post(apiUrl, formData)
      .pipe(
        finalize(() => this.isSubmitting = false)
      )
      .subscribe({
        next: (response: any) => {
          this.success = true;
          this.progress.step3 = true;
          
          // Reset forms after successful submission
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
    this.accountData = {
      user: {} as any,
      company: {} as any,
      documents: []
    };
  }

  // UI helpers
  getStepIcon(step: number): string {
    if (step === 1) return '👤';
    if (step === 2) return '🏢';
    if (step === 3) return '📄';
    return '●';
  }

  getRequiredDocuments(): any[] {
    if (!this.selectedPartnerType) return [];
    return this.documentTypes.filter(doc => 
      doc.requiredFor.includes(this.selectedPartnerType!.code)
    );
  }

  getOptionalDocuments(): any[] {
    if (!this.selectedPartnerType) return [];
    return this.documentTypes.filter(doc => 
      !doc.requiredFor.includes(this.selectedPartnerType!.code)
    );
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

  private scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Password strength check
  checkPasswordStrength(password: string): { strength: number; message: string } {
    if (!password) return { strength: 0, message: 'Введите пароль' };
    
    let strength = 0;
    let message = '';
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    switch (strength) {
      case 0:
      case 1:
        message = 'Слабый';
        break;
      case 2:
      case 3:
        message = 'Средний';
        break;
      case 4:
        message = 'Хороший';
        break;
      case 5:
        message = 'Отличный';
        break;
    }
    
    return { strength, message };
  }


  selectPartnerType(type: PartnerType): void {
  this.selectedPartnerType = type;
  this.companyForm.patchValue({
    partnerTypeId: type.id
  });
}

// Дополнительные методы для нового дизайна
getStepTitle(step: number): string {
  switch(step) {
    case 1: return 'Пользователь';
    case 2: return 'Компания';
    case 3: return 'Документы';
    default: return `Шаг ${step}`;
  }
}

getStepStatus(step: number): string {
  if (this.currentStep === step) return 'active';
  if (step === 1 && this.progress.step1) return 'completed';
  if (step === 2 && this.progress.step2) return 'completed';
  if (step === 3 && this.progress.step3) return 'completed';
  return 'pending';
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



}