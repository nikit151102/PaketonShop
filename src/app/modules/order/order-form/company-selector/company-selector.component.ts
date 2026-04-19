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

  isSelectionMode = false;
  previewedCompany: any | null = null;
  hoveredCompanyId: string | null = null;

  showModal = false;
  modalMode: 'add' | 'edit' = 'add';
  selectedCompanyForEdit: any | null = null;

  private destroy$ = new Subject<void>();

  constructor(private partnerService: PartnerService) { }

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
            if (this.selectedCompanyId) {
              const selected = this.companies.find(c => c.id === this.selectedCompanyId);
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

  onCompanyClick(company: any): void {
    this.previewedCompany = company;
    this.isSelectionMode = true;
  }

  enterSelectionMode(): void {
    this.isSelectionMode = true;
    if (this.selectedCompanyId) {
      const selected = this.companies.find(c => c.id === this.selectedCompanyId);
      if (selected) {
        this.previewedCompany = selected;
      }
    }
  }

  previewCompany(company: any): void {
    this.previewedCompany = company;
  }

  confirmSelection(): void {
    if (!this.previewedCompany) return;

    this.selectedCompanyId = this.previewedCompany.id;
    this.selectedCompanyChange.emit(this.selectedCompanyId);
    this.isSelectionMode = false;
  }

  cancelSelection(): void {
    this.isSelectionMode = false;
    this.previewedCompany = null;
  }

  unselectCompany(): void {
    this.selectedCompanyId = null;
    this.selectedCompanyChange.emit(null);
    this.previewedCompany = null;
  }

  openAddModal(): void {
    this.modalMode = 'add';
    this.selectedCompanyForEdit = null;
    this.showModal = true;
  }

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

  onCompanySaved(company: any): void {
    this.loadCompanies();
    this.closeModal();

    if (this.modalMode === 'add') {
      this.companyAdded.emit();
    } else {
      this.companyEdited.emit(company);
    }
  }

  selectCompany(companyId: string): void {
    this.selectedCompanyId = companyId;
    this.selectedCompanyChange.emit(companyId);

    const selected = this.companies.find(c => c.id === companyId);
    if (selected) {
      this.previewedCompany = selected;
    }
  }

  clearSelection(): void {
    this.selectedCompanyId = null;
    this.selectedCompanyChange.emit(null);
    this.previewedCompany = null;
  }

  // Добавьте метод для удаления
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
            this.companies = this.companies.filter(c => c.id !== companyId);

            // Если удаляем выбранную компанию
            if (this.selectedCompanyId === companyId) {
              this.clearSelection();
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

  getSelectedCompany(): any | undefined {
    return this.companies.find(c => c.id === this.selectedCompanyId);
  }

  getCompanyDisplayName(company: any): string {
    // Используем partner.shortName или partner.fullName если есть, иначе shortName/fullName из company
    if (company.partner) {
      return company.partner.shortName || company.partner.fullName || company.partner.firstName || 'Без названия';
    }
    return company.shortName || company.fullName || company.partner?.firstName || 'Без названия';
  }

  getCompanyInn(company: any): string {
    if (company.partner) {
      return company.partner.inn || '—';
    }
    return company.inn || '—';
  }

  getCompanyKpp(company: any): string {
    if (company.partner) {
      return company.partner.kpp;
    }
    return company.kpp;
  }


  getCompanyType(company: any): string {
    if (company.partnerType) {
      return company.partnerType.shortName || company.partnerType.name || 'Юридическое лицо';
    }
    if (company.partner?.partnerType) {
      return company.partner.partnerType.shortName || 'Юридическое лицо';
    }
    return 'Юридическое лицо';
  }
}