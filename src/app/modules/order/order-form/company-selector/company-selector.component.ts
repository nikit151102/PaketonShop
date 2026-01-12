import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { PartnerService } from '../../../../core/api/partner.service';

@Component({
  selector: 'app-company-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './company-selector.component.html',
  styleUrls: ['./company-selector.component.scss']
})
export class CompanySelectorComponent implements OnInit, OnDestroy {
  @Input() selectedCompanyId: string | null = null;
  @Output() selectedCompanyChange = new EventEmitter<string | null>();
  @Output() companyAdded = new EventEmitter<void>();
  @Output() companyEdited = new EventEmitter<any>();
  @Output() companyDeleted = new EventEmitter<string>();

  companies: any[] = [];
  loading = false;
  error: string | null = null;
  
  // Состояния UI
  isSelectionMode = false;
  previewedCompany: any | null = null;
  hoveredCompanyId: string | null = null;
  
  // Модальные окна
  showModal = false;
  modalMode: 'add' | 'edit' = 'add';
  selectedCompanyForEdit: any | null = null;

  private destroy$ = new Subject<void>();

  constructor(private partnerService: PartnerService) {}

  ngOnInit(): void {
    this.loadCompanies();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCompanies(): void {
    this.loading = true;
    this.error = null;

    this.partnerService.getPartnersUser()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.data) {
            this.companies = response.data;
            // Если есть выбранная компания, устанавливаем её для превью
            if (this.selectedCompanyId) {
              const selected = this.companies.find(c => c.id.toString() === this.selectedCompanyId);
              if (selected) {
                this.previewedCompany = selected;
              }
            }
          }
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Ошибка загрузки компаний';
          console.error('Ошибка загрузки компаний:', err);
          this.loading = false;
        }
      });
  }

  // Обработка клика по компании в обычном режиме
  onCompanyClick(company: any): void {
    this.previewedCompany = company;
    this.isSelectionMode = true;
  }

  // Вход в режим выбора
  enterSelectionMode(): void {
    this.isSelectionMode = true;
    if (this.selectedCompanyId) {
      const selected = this.companies.find(c => c.id.toString() === this.selectedCompanyId);
      if (selected) {
        this.previewedCompany = selected;
      }
    }
  }

  // Предпросмотр компании в режиме выбора
  previewCompany(company: any): void {
    this.previewedCompany = company;
  }

  // Подтверждение выбора
  confirmSelection(): void {
    if (!this.previewedCompany) return;
    
    this.selectedCompanyId = this.previewedCompany.id.toString();
    this.selectedCompanyChange.emit(this.selectedCompanyId);
    this.isSelectionMode = false;
  }

  // Отмена выбора
  cancelSelection(): void {
    this.isSelectionMode = false;
    this.previewedCompany = null;
  }

  // Отмена выбранной компании
  unselectCompany(): void {
    this.selectedCompanyId = null;
    this.selectedCompanyChange.emit(null);
    this.previewedCompany = null;
  }

  // Модальное окно добавления
  openAddModal(): void {
    this.modalMode = 'add';
    this.selectedCompanyForEdit = null;
    this.showModal = true;
  }

  // Модальное окно редактирования
  openEditModal(company: any, event?: Event): void {
    if (event) event.stopPropagation();
    this.modalMode = 'edit';
    this.selectedCompanyForEdit = company;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedCompanyForEdit = null;
  }

  // Обработка сохранения компании
  onCompanySaved(company: any): void {
    this.loadCompanies(); // Перезагружаем список
    this.closeModal();
    
    if (this.modalMode === 'add') {
      this.companyAdded.emit();
    } else {
      this.companyEdited.emit(company);
    }
  }

  // Удаление компании
  deleteCompany(companyId: string, event: Event): void {
    event.stopPropagation();
    
    if (!confirm('Вы уверены, что хотите удалить эту компанию?')) {
      return;
    }

    this.partnerService.deletePartnersUser(companyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.companies = this.companies.filter(c => c.id.toString() !== companyId);
            
            // Если удаляем выбранную компанию
            if (this.selectedCompanyId === companyId) {
              this.unselectCompany();
            }
            
            // Если удаляем preview компанию
            if (this.previewedCompany?.id.toString() === companyId) {
              this.previewedCompany = null;
            }
            
            this.companyDeleted.emit(companyId);
          }
        },
        error: (err) => {
          console.error('Ошибка удаления компании:', err);
          alert('Не удалось удалить компанию');
        }
      });
  }

  // Вспомогательные методы
  getSelectedCompany(): any | undefined {
    return this.companies.find(c => c.id.toString() === this.selectedCompanyId);
  }

  getCompanyDisplayName(company: any): string {
    if (company.shortName) {
      return company.shortName;
    }
    return company.fullName;
  }

  getCompanyDetails(company: any): string {
    const details = [];
    if (company.inn) details.push(`ИНН: ${company.inn}`);
    if (company.kpp) details.push(`КПП: ${company.kpp}`);
    return details.join(' • ');
  }
}