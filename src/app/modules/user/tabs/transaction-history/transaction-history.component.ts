import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { PaymentService } from '../../../../core/api/payment.service';
import { TitleComponent } from '../../../../core/components/title/title.component';

interface Transaction {
  id: string;
  delta: number;
  description: string;
  paymentStatus: number;
  message: string;
  date: string;
  statusText: string;
  statusColor: string;
  statusIcon: string;
  isPositive: boolean;
}

interface FilterRequest {
  filters: any[];
  sorts: any[];
  page: number;
  pageSize: number;
}

@Component({
  selector: 'app-transaction-history',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, TitleComponent],
  templateUrl: './transaction-history.component.html',
  styleUrls: ['./transaction-history.component.scss']
})
export class TransactionHistoryComponent implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  loading = false;
  loadingMore = false;
  error: string | null = null;

  // Фильтры
  searchTerm = '';
  typeFilter: 'all' | 'income' | 'expense' = 'all';
  dateFilter: 'all' | 'week' | 'month' | 'quarter' = 'all';

  // Статистика
  totalIncome: number = 0;
  totalExpense: number = 0;
  currentBalance: number = 0;

  // Пагинация
  currentPage: number = 0;
  pageSize: number = 20;
  totalPages: number = 0;
  totalCount: number = 0;
  hasMore: boolean = true;
  private scrollThreshold: number = 200;

  private destroy$ = new Subject<void>();

  constructor(private paymentService: PaymentService) { }

  ngOnInit(): void {
    this.loadTransactions(true);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.loadingMore || !this.hasMore) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollPosition >= documentHeight - this.scrollThreshold) {
      this.loadMoreTransactions();
    }
  }

  loadTransactions(reset: boolean = true): void {
    if (reset) {
      this.transactions = [];
      this.currentPage = 0;
      this.hasMore = true;
      this.totalIncome = 0;
      this.totalExpense = 0;
      this.currentBalance = 0;
    }

    this.loading = reset;
    this.error = null;

    const requestData = this.buildRequestData();

    this.paymentService.getTransactions(requestData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.loadingMore = false;
        })
      )
      .subscribe({
        next: (response: any) => {
          if (response.data && Array.isArray(response.data)) {
            const transformedTransactions = this.transformTransactions(response.data);

            if (reset) {
              this.transactions = transformedTransactions;
            } else {
              this.transactions = [...this.transactions, ...transformedTransactions];
            }

            // Обновляем информацию о пагинации
            this.totalPages = response.pageCount || 0;
            this.totalCount = response.totalCount || 0;
            this.hasMore = this.currentPage + 1 < this.totalPages;

            // Пересчитываем статистику
            this.calculateStats();
          } else {
            this.hasMore = false;
          }
        },
        error: (err) => {
          console.error('Ошибка загрузки транзакций:', err);
          this.error = err.error?.message || 'Не удалось загрузить историю транзакций';
          this.hasMore = false;
        }
      });
  }

  loadMoreTransactions(): void {
    if (!this.hasMore || this.loadingMore || this.loading) return;

    this.loadingMore = true;
    this.currentPage++;
    this.loadTransactions(false);
  }

  private buildRequestData(): FilterRequest {
    const filters: any[] = [];

    // Фильтр по типу
    if (this.typeFilter !== 'all') {
      filters.push({
        field: 'delta',
        operator: this.typeFilter === 'income' ? 'greaterThan' : 'lessThan',
        value: 0
      });
    }

    // Фильтр по дате
    if (this.dateFilter !== 'all') {
      const date = new Date();
      let startDate: Date;

      switch (this.dateFilter) {
        case 'week':
          startDate = new Date(date.setDate(date.getDate() - 7));
          break;
        case 'month':
          startDate = new Date(date.setMonth(date.getMonth() - 1));
          break;
        case 'quarter':
          startDate = new Date(date.setMonth(date.getMonth() - 3));
          break;
        default:
          startDate = new Date(0);
      }

      filters.push({
        field: 'date',
        operator: 'greaterThanOrEqual',
        value: startDate.toISOString()
      });
    }

    // Поиск по описанию
    if (this.searchTerm) {
      filters.push({
        field: 'description',
        operator: 'contains',
        value: this.searchTerm
      });
    }

    return {
      filters: filters,
      sorts: [
        {
          field: 'date',
          direction: 'desc'
        }
      ],
      page: this.currentPage,
      pageSize: this.pageSize
    };
  }

  private transformTransactions(data: any[]): Transaction[] {
    return data.map(item => {
      const delta = item.delta || 0;
      const isPositive = delta > 0;
      const statusInfo = this.getStatusInfo(item.paymentStatus);

      return {
        id: item.id,
        delta: delta,
        description: item.description || (isPositive ? 'Пополнение баланса' : 'Списание средств'),
        paymentStatus: item.paymentStatus,
        message: item.message || '',
        date: item.date || new Date().toISOString(),
        statusText: statusInfo.text,
        statusColor: statusInfo.color,
        statusIcon: statusInfo.icon,
        isPositive: isPositive
      };
    });
  }

  private getStatusInfo(status: number): { text: string; color: string; icon: string } {
    switch (status) {
      case 0:
        return { text: 'Ожидает', color: 'warning', icon: '⏳' };
      case 1:
        return { text: 'Успешно', color: 'success', icon: '✅' };
      case 2:
        return { text: 'Отменен', color: 'danger', icon: '❌' };
      case 3:
        return { text: 'В обработке', color: 'info', icon: '🔄' };
      default:
        return { text: 'Неизвестно', color: 'default', icon: '❓' };
    }
  }

  private calculateStats(): void {
    this.totalIncome = this.transactions
      .filter(t => t.isPositive)
      .reduce((sum, t) => sum + t.delta, 0);

    this.totalExpense = this.transactions
      .filter(t => !t.isPositive)
      .reduce((sum, t) => sum + Math.abs(t.delta), 0);

    this.currentBalance = this.totalIncome - this.totalExpense;
  }

  applyFilters(): void {
    this.currentPage = 0;
    this.hasMore = true;
    this.loadTransactions(true);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.typeFilter = 'all';
    this.dateFilter = 'all';
    this.applyFilters();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amount);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFilteredCount(): number {
    return this.transactions.length;
  }

  getAbsValue(value: number): number {
    return Math.abs(value);
  }

  goBack(): void {
    window.history.back();
  }
}