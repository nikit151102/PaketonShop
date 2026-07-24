import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, HostListener, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environment';

interface Filter {
  id: string;
  fullName: string;
  description: string;
  measurementUnit?: {
    id: string;
    code: number;
    name: string | null;
    shortName: string;
    coef: number;
  };
  uniqueValues: string[] | null;
  filterType: number;
  hasMultipleValues?: boolean;
}

interface FilterDetail {
  isDeleted: boolean;
  id: string;
  fullName: string;
  description: string;
  rate: number;
  measurementUnit?: {
    id: string;
    code: number;
    name: string | null;
    shortName: string;
    coef: number;
    numerator?: number;
    denominator?: number;
    code1c?: string;
    internationalCode?: string;
  };
  uniqueValues: string[];
  filterType: number;
}

interface RangeValue {
  min: number;
  max: number;
}

interface ActiveFilter {
  filterId: string;
  filterName: string;
  type: 'checkbox' | 'range';
  values?: string[];
  range?: RangeValue;
}

interface BatchApiResponse {
  message: string;
  status: number;
  pageCount?: number;
  totalCount?: number;
  page?: number;
  pageSize?: number;
  data: FilterDetail[];
  breadCrumbs?: string[];
  result?: { [key: string]: any };
}

@Component({
  selector: 'app-filters',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filters.component.html',
  styleUrls: ['./filters.component.scss']
})
export class FiltersComponent implements OnInit, OnChanges, OnDestroy {
  @Input() filters: Filter[] = [];
  @Input() productsCount: number = 0;
  @Input() categoryId?: string;
  @Output() filtersChange = new EventEmitter<any[]>();
  @Output() filtersApplied = new EventEmitter<void>();

  private readonly RANGE_STEP = 0.1;
  searchQuery: string = '';
  filteredFilters: Filter[] = [];
  allFilters: Filter[] = [];
  activeFilters: ActiveFilter[] = [];
  expandedFilters: Set<string> = new Set();
  rangeValues: { [key: string]: RangeValue } = {};
  isMobile: boolean = false;
  isMobileOpen: boolean = false;
  filterStats: { [key: string]: { [value: string]: number } } = {};
  loadingFilters: Set<string> = new Set();
  isBatchLoading: boolean = false;

  // ✅ Флаг для предотвращения бесконечного цикла при применении фильтров
  private isApplyingFilters: boolean = false;

  rangeMinValues: { [key: string]: number } = {};
  rangeMaxValues: { [key: string]: number } = {};
  private originalRangeMins: { [key: string]: number } = {};
  private originalRangeMaxs: { [key: string]: number } = {};
  private loadedFilters: Set<string> = new Set();
  private readonly batchApiUrl = `${environment.production}/api/Entities/ProductProperty/GetUniqueValuesForList`;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.checkMobile();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filters'] && this.filters) {
      this.initializeFilters();
      // ✅ Загружаем фильтры только если не в процессе применения
      if (!this.isApplyingFilters) {
        this.loadFiltersBatch();
      }
    }

    if (changes['categoryId'] && this.categoryId) {
      this.loadedFilters.clear();
      if (!this.isApplyingFilters) {
        this.loadFiltersBatch();
      }
    }
  }

  ngOnDestroy() { }

  @HostListener('window:resize')
  onResize() {
    this.checkMobile();
  }

  checkMobile() {
    this.isMobile = window.innerWidth < 993;
    if (!this.isMobile) {
      this.isMobileOpen = false;
    }
  }

  initializeFilters() {
    this.allFilters = [...this.filters];
    this.filteredFilters = [];

    this.filters.forEach(filter => {
      if (filter.filterType === 1) {
        const initialValue = { min: 0, max: 100 };
        this.rangeValues[filter.id] = initialValue;
        this.rangeMinValues[filter.id] = initialValue.min;
        this.rangeMaxValues[filter.id] = initialValue.max;
      }
    });
  }

  private filterFiltersByValueCount(): void {
    this.filteredFilters = this.allFilters.filter(filter => {
      if (filter.filterType === 0) {
        const uniqueValuesCount = filter.uniqueValues?.length || 0;
        filter.hasMultipleValues = uniqueValuesCount > 1;
        return uniqueValuesCount > 1;
      }
      if (filter.filterType === 1) {
        const min = this.originalRangeMins[filter.id];
        const max = this.originalRangeMaxs[filter.id];
        return min !== undefined && max !== undefined && min < max;
      }
      return true;
    });
  }

  async loadFiltersBatch(): Promise<void> {
    if (!this.filters?.length || !this.categoryId) return;
    if (this.isBatchLoading || this.isApplyingFilters) return;

    const filterIds = this.filters.map(f => f.id).filter(id => !this.loadedFilters.has(id));
    if (filterIds.length === 0) {
      this.filterFiltersByValueCount();
      return;
    }

    this.isBatchLoading = true;
    this.loadingFilters = new Set(filterIds);

    try {
      const formData = new FormData();
      filterIds.forEach(id => formData.append('ProductPropertiesIds', id));
      formData.append('CategoryIds', this.categoryId);

      const response = await firstValueFrom(
        this.http.post<BatchApiResponse>(this.batchApiUrl, formData)
      );

      if (response.status === 200 && response.data?.length) {
        this.processBatchResponse(response.data);
      } else {
        this.setFallbackValues(filterIds);
      }
    } catch (error) {
      this.setFallbackValues(filterIds);
    } finally {
      this.isBatchLoading = false;
      this.loadingFilters.clear();
      this.filterFiltersByValueCount();
    }
  }

  private processBatchResponse(data: FilterDetail[]): void {
    data.forEach(detail => {
      const index = this.allFilters.findIndex(f => f.id === detail.id);
      if (index === -1) return;

      this.allFilters[index] = {
        ...this.allFilters[index],
        uniqueValues: detail.uniqueValues || [],
        filterType: detail.filterType,
        measurementUnit: detail.measurementUnit
      };

      if (detail.filterType === 1 && detail.uniqueValues?.length) {
        const numericValues = detail.uniqueValues
          .map(v => this.extractNumericValue(v))
          .filter((v): v is number => v !== null);

        if (numericValues.length > 0) {
          const min = Math.min(...numericValues);
          const max = Math.max(...numericValues);
          const roundedMin = Math.round(min * 10) / 10;
          const roundedMax = Math.round(max * 10) / 10;

          this.rangeValues[detail.id] = { min: roundedMin, max: roundedMax };
          this.rangeMinValues[detail.id] = roundedMin;
          this.rangeMaxValues[detail.id] = roundedMax;
          this.originalRangeMins[detail.id] = roundedMin;
          this.originalRangeMaxs[detail.id] = roundedMax;
          this.updateRangeSlider(detail.id);
        } else {
          this.originalRangeMins[detail.id] = 0;
          this.originalRangeMaxs[detail.id] = 0;
        }
      }

      this.loadedFilters.add(detail.id);
    });
  }

  private setFallbackValues(filterIds: string[]): void {
    filterIds.forEach(id => {
      const index = this.allFilters.findIndex(f => f.id === id);
      if (index !== -1) {
        this.allFilters[index].uniqueValues = [];
        this.loadedFilters.add(id);
      }
    });
  }

  private extractNumericValue(value: any): number | null {
    if (typeof value === 'number') {
      return Math.round(value * 10) / 10;
    }
    if (typeof value === 'string') {
      const clean = value.trim().replace(/[^\d.,\-]/g, '').replace(',', '.');
      const num = parseFloat(clean);
      if (isNaN(num)) return null;
      return Math.round(num * 10) / 10;
    }
    return null;
  }

  private updateRangeSlider(filterId: string) {
    setTimeout(() => {
      const minInput = document.querySelector(`.range-min[data-filter-id="${filterId}"]`) as HTMLInputElement;
      const maxInput = document.querySelector(`.range-max[data-filter-id="${filterId}"]`) as HTMLInputElement;
      if (minInput && this.rangeMinValues[filterId] !== undefined) {
        minInput.value = this.rangeMinValues[filterId].toString();
      }
      if (maxInput && this.rangeMaxValues[filterId] !== undefined) {
        maxInput.value = this.rangeMaxValues[filterId].toString();
      }
      this.updateRangeSelection(filterId);
    }, 0);
  }

  private updateRangeSelection(filterId: string) {
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;
    this.getSelectedRangeLeft(filter);
    this.getSelectedRangeRight(filter);
  }

  toggleMobileFilters() {
    this.isMobileOpen = !this.isMobileOpen;
    document.body.style.overflow = this.isMobileOpen ? 'hidden' : '';
  }

  closeMobileFilters() {
    this.isMobileOpen = false;
    document.body.style.overflow = '';
  }

  filterFilters() {
    if (!this.searchQuery.trim()) {
      this.filteredFilters = this.allFilters.filter(filter => {
        if (filter.filterType === 0) {
          return (filter.uniqueValues?.length || 0) > 1;
        }
        return true;
      });
      return;
    }

    const query = this.searchQuery.toLowerCase();
    this.filteredFilters = this.allFilters.filter(filter => {
      if (filter.filterType === 0 && (filter.uniqueValues?.length || 0) <= 1) {
        return false;
      }
      return filter.fullName.toLowerCase().includes(query) ||
             filter.description.toLowerCase().includes(query);
    });
  }

  toggleFilterGroup(filterId: string) {
    if (this.loadingFilters.has(filterId) || this.isBatchLoading) return;
    if (this.expandedFilters.has(filterId)) {
      this.expandedFilters.delete(filterId);
    } else {
      this.expandedFilters.add(filterId);
    }
  }

  isFilterExpanded(filterId: string): boolean {
    return this.expandedFilters.has(filterId);
  }

  getUniqueValues(filter: Filter): string[] {
    return filter.uniqueValues || [];
  }

  getValueCount(filterId: string, value: string): number {
    return this.filterStats[filterId]?.[value] || 0;
  }

  toggleCheckbox(filter: Filter, value: string) {
    if (this.loadingFilters.has(filter.id) || this.isBatchLoading) return;

    const activeFilter = this.activeFilters.find(f => f.filterId === filter.id);

    if (activeFilter && activeFilter.values) {
      const index = activeFilter.values.indexOf(value);
      if (index > -1) {
        activeFilter.values.splice(index, 1);
        if (activeFilter.values.length === 0) {
          this.activeFilters = this.activeFilters.filter(f => f.filterId !== filter.id);
        }
      } else {
        activeFilter.values.push(value);
      }
    } else {
      this.activeFilters.push({
        filterId: filter.id,
        filterName: filter.fullName,
        type: 'checkbox',
        values: [value]
      });
    }

    this.emitFiltersChange();
    // ✅ Не перезагружаем другие фильтры при применении — это делает родитель
  }

  // ✅ УДАЛЕНО: reloadOtherFilters — чтобы не было бесконечного цикла

  isChecked(filterId: string, value: string): boolean {
    const activeFilter = this.activeFilters.find(f => f.filterId === filterId);
    return activeFilter?.values?.includes(value) || false;
  }

  getRangeMin(filter: Filter): number {
    return this.originalRangeMins[filter.id] !== undefined ? this.originalRangeMins[filter.id] : 0;
  }

  getRangeMax(filter: Filter): number {
    return this.originalRangeMaxs[filter.id] !== undefined ? this.originalRangeMaxs[filter.id] : 100;
  }

  getRangeStep(filter: Filter): number {
    return this.RANGE_STEP;
  }

  getRangeValue(filter: Filter, type: 'min' | 'max'): string {
    const value = type === 'min' ? this.rangeMinValues[filter.id] : this.rangeMaxValues[filter.id];
    const displayValue = value !== undefined ? value : this.getRangeMin(filter);
    const unit = filter.measurementUnit?.shortName || '';
    const formattedValue = Number.isInteger(displayValue)
      ? displayValue.toString()
      : displayValue.toFixed(1).replace(/\.0$/, '');
    return `${formattedValue}${unit ? ' ' + unit : ''}`;
  }

  onRangeMinChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId) || this.isBatchLoading) return;
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    value = Math.round(value * 10) / 10;
    const maxValue = this.rangeMaxValues[filterId] ?? this.getRangeMax(filter);
    const minValue = this.getRangeMin(filter);
    value = Math.max(minValue, Math.min(value, maxValue));

    this.rangeMinValues[filterId] = value;
    if (this.rangeValues[filterId]) this.rangeValues[filterId].min = value;
    input.value = value.toString();

    this.updateRangeFilter(filter, this.rangeValues[filterId] || { min: value, max: maxValue });
    this.emitFiltersChange();
    // ✅ Не перезагружаем другие фильтры
    this.updateRangeSelection(filterId);
  }

  onRangeMaxChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId) || this.isBatchLoading) return;
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    value = Math.round(value * 10) / 10;
    const minValue = this.rangeMinValues[filterId] ?? this.getRangeMin(filter);
    const maxValue = this.getRangeMax(filter);
    value = Math.max(minValue, Math.min(value, maxValue));

    this.rangeMaxValues[filterId] = value;
    if (this.rangeValues[filterId]) this.rangeValues[filterId].max = value;
    input.value = value.toString();

    this.updateRangeFilter(filter, this.rangeValues[filterId] || { min: minValue, max: value });
    this.emitFiltersChange();
    // ✅ Не перезагружаем другие фильтры
    this.updateRangeSelection(filterId);
  }

  onRangeInputMinChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId) || this.isBatchLoading) return;
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    if (isNaN(value)) value = this.getRangeMin(filter);
    value = Math.round(value * 10) / 10;

    const minValue = this.getRangeMin(filter);
    const currentMax = this.rangeMaxValues[filterId] ?? this.getRangeMax(filter);
    const clampedValue = Math.max(minValue, Math.min(currentMax, value));

    this.rangeMinValues[filterId] = clampedValue;
    if (this.rangeValues[filterId]) this.rangeValues[filterId].min = clampedValue;

    const minRangeInput = document.querySelector(`.range-min[data-filter-id="${filterId}"]`) as HTMLInputElement;
    if (minRangeInput) minRangeInput.value = clampedValue.toString();
    input.value = clampedValue.toString();

    this.updateRangeFilter(filter, this.rangeValues[filterId] || { min: clampedValue, max: currentMax });
    this.emitFiltersChange();
    // ✅ Не перезагружаем другие фильтры
    this.updateRangeSelection(filterId);
  }

  onRangeInputMaxChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId) || this.isBatchLoading) return;
    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    if (isNaN(value)) value = this.getRangeMax(filter);
    value = Math.round(value * 10) / 10;

    const maxValue = this.getRangeMax(filter);
    const currentMin = this.rangeMinValues[filterId] ?? this.getRangeMin(filter);
    const clampedValue = Math.max(currentMin, Math.min(maxValue, value));

    this.rangeMaxValues[filterId] = clampedValue;
    if (this.rangeValues[filterId]) this.rangeValues[filterId].max = clampedValue;

    const maxRangeInput = document.querySelector(`.range-max[data-filter-id="${filterId}"]`) as HTMLInputElement;
    if (maxRangeInput) maxRangeInput.value = clampedValue.toString();
    input.value = clampedValue.toString();

    this.updateRangeFilter(filter, this.rangeValues[filterId] || { min: currentMin, max: clampedValue });
    this.emitFiltersChange();
    // ✅ Не перезагружаем другие фильтры
    this.updateRangeSelection(filterId);
  }

  updateRangeFilter(filter: Filter, range: RangeValue) {
    const existingIndex = this.activeFilters.findIndex(f => f.filterId === filter.id);
    const defaultMin = this.getRangeMin(filter);
    const defaultMax = this.getRangeMax(filter);

    if (range.min === defaultMin && range.max === defaultMax) {
      if (existingIndex > -1) this.activeFilters.splice(existingIndex, 1);
    } else {
      const activeFilter: ActiveFilter = {
        filterId: filter.id,
        filterName: filter.fullName,
        type: 'range',
        range: { ...range }
      };
      if (existingIndex > -1) {
        this.activeFilters[existingIndex] = activeFilter;
      } else {
        this.activeFilters.push(activeFilter);
      }
    }
    this.emitFiltersChange();
  }

  getSelectedRangeLeft(filter: Filter): string {
    const min = this.getRangeMin(filter);
    const max = this.getRangeMax(filter);
    const currentMin = this.rangeMinValues[filter.id] ?? min;
    if (max === min) return '0%';
    const percentage = ((currentMin - min) / (max - min)) * 100;
    return `${Math.min(Math.max(percentage, 0), 100)}%`;
  }

  getSelectedRangeRight(filter: Filter): string {
    const min = this.getRangeMin(filter);
    const max = this.getRangeMax(filter);
    const currentMax = this.rangeMaxValues[filter.id] ?? max;
    if (max === min) return '0%';
    const percentage = ((max - currentMax) / (max - min)) * 100;
    return `${Math.min(Math.max(percentage, 0), 100)}%`;
  }

  getFilterValueText(filter: ActiveFilter): string {
    if (filter.type === 'checkbox' && filter.values) {
      return filter.values.join(', ');
    } else if (filter.type === 'range' && filter.range) {
      const unit = filter.filterName ?
        this.filters.find(f => f.id === filter.filterId)?.measurementUnit?.shortName || '' : '';
      return `${filter.range.min}${unit ? ' ' + unit : ''} – ${filter.range.max}${unit ? ' ' + unit : ''}`;
    }
    return '';
  }

  removeFilter(filter: ActiveFilter) {
    this.activeFilters = this.activeFilters.filter(f => f.filterId !== filter.filterId);

    if (filter.type === 'range') {
      const originalFilter = this.filters.find(f => f.id === filter.filterId);
      if (originalFilter) {
        const defaultMin = this.getRangeMin(originalFilter);
        const defaultMax = this.getRangeMax(originalFilter);
        this.rangeValues[filter.filterId] = { min: defaultMin, max: defaultMax };
        this.rangeMinValues[filter.filterId] = defaultMin;
        this.rangeMaxValues[filter.filterId] = defaultMax;
        this.updateRangeSlider(filter.filterId);
      }
    }

    this.emitFiltersChange();
    // ✅ Не перезагружаем другие фильтры
  }

  clearAllFilters() {
    if (this.loadingFilters.size > 0 || this.isBatchLoading) {
      this.closeMobileFilters();
      return;
    }

    this.activeFilters = [];
    this.closeMobileFilters();

    this.filters.forEach(filter => {
      if (filter.filterType === 1) {
        const defaultMin = this.getRangeMin(filter);
        const defaultMax = this.getRangeMax(filter);
        this.rangeValues[filter.id] = { min: defaultMin, max: defaultMax };
        this.rangeMinValues[filter.id] = defaultMin;
        this.rangeMaxValues[filter.id] = defaultMax;
        this.updateRangeSlider(filter.id);
      }
    });

    this.emitFiltersChange();
    // ✅ Сбрасываем загруженные фильтры и перезагружаем только при явном запросе
    this.loadedFilters.clear();
    if (!this.isApplyingFilters) {
      this.loadFiltersBatch();
    }
  }

  showMore(filterId: string) {
    if (this.loadingFilters.has(filterId) || this.isBatchLoading) return;
    this.expandedFilters.add(filterId);
  }

  applyFilters() {
    if (this.loadingFilters.size > 0 || this.isBatchLoading) return;
    // ✅ Устанавливаем флаг, чтобы предотвратить перезагрузку фильтров
    this.isApplyingFilters = true;
    this.filtersApplied.emit();
    // ✅ Сбрасываем флаг после небольшой задержки
    setTimeout(() => { this.isApplyingFilters = false; }, 100);
    if (this.isMobile) {
      this.closeMobileFilters();
    }
  }

  get activeFiltersCount(): number {
    return this.activeFilters.length;
  }

  get filteredProductsCount(): number {
    return Math.max(this.productsCount - this.activeFilters.length * 10, 0);
  }

emitFiltersChange() {
  const filters = this.activeFilters.map(filter => {
    if (filter.type === 'checkbox') {
      return { 
        field: filter.filterName, 
        values: filter.values, 
        type: 0
      };
    } else {
      return { 
        field: filter.filterName, 
        values: [filter.range?.min, filter.range?.max], 
        type: 5
      };
    }
  });
  this.filtersChange.emit(filters);
}
}