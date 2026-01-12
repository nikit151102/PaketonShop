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

interface ApiResponse {
  message: string;
  status: number;
  data: Filter[];
  breadCrumbs: string[];
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

  searchQuery: string = '';
  filteredFilters: Filter[] = [];
  activeFilters: ActiveFilter[] = [];
  expandedFilters: Set<string> = new Set();
  rangeValues: { [key: string]: RangeValue } = {};
  isMobile: boolean = false;
  isMobileOpen: boolean = false;
  filterStats: { [key: string]: { [value: string]: number } } = {};
  loadingFilters: Set<string> = new Set();
  
  // Для двухстороннего связывания ползунков
  rangeMinValues: { [key: string]: number } = {};
  rangeMaxValues: { [key: string]: number } = {};
  
  // Для предотвращения повторных запросов
  private loadedFilters: Set<string> = new Set();
  private readonly apiUrl = `${environment.production}/api/Entities/ProductProperty/GetUniqueValues`;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.checkMobile();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filters'] && this.filters) {
      console.log('Filters changed:', this.filters);
      this.initializeFilters();
      this.loadFiltersData();
    }
    
    if (changes['categoryId'] && this.categoryId) {
      // При изменении категории перезагружаем фильтры
      this.loadedFilters.clear();
      this.loadFiltersData();
    }
  }

  ngOnDestroy() {
    // Очистка
  }

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
    this.filteredFilters = [...this.filters];
    
    // Инициализация значений для ползунков
    this.filters.forEach(filter => {
      if (filter.filterType === 1) {
        const initialValue = {
          min: 0,
          max: 100
        };
        this.rangeValues[filter.id] = initialValue;
        this.rangeMinValues[filter.id] = initialValue.min;
        this.rangeMaxValues[filter.id] = initialValue.max;
      }
    });
  }

  async loadFiltersData() {
    if (!this.filters || this.filters.length === 0) return;
    
    // Загружаем только те фильтры, которые еще не загружены
    const filtersToLoad = this.filters.filter(filter => 
      !this.loadedFilters.has(filter.id) && 
      !this.loadingFilters.has(filter.id)
    );
    
    const promises = filtersToLoad.map(filter => this.loadFilterData(filter));
    await Promise.all(promises);
  }

  async loadFilterData(filter: Filter): Promise<void> {
    if (this.loadingFilters.has(filter.id) || this.loadedFilters.has(filter.id)) return;
    
    this.loadingFilters.add(filter.id);
    
    try {

      const response = await firstValueFrom(
        this.http.get<ApiResponse>(`${this.apiUrl}/${filter.id}`)
      );

      if (response.data) {
        const filterData: any = response.data;
          console.log('filterData',filterData)
        // Обновляем фильтр
        const index = this.filters.findIndex(f => f.id === filter.id);
        if (index !== -1) {
          // Сохраняем оригинальные данные, добавляем уникальные значения
          this.filters[index] = {
            ...this.filters[index],
            uniqueValues: filterData.uniqueValues || [],
            filterType: filterData.filterType || this.filters[index].filterType
          };

          // Для диапазонных фильтров загружаем min/max
          if (filterData.filterType === 1) {
            await this.loadRangeValues(filter.id);
          }
          
          // Обновляем filteredFilters
          this.updateFilteredFilters(filter.id, this.filters[index]);
        }
        
        this.loadedFilters.add(filter.id);
      } else {
        // Если API не вернул данные, используем пустые значения
        this.setFallbackValues(filter);
      }
    } catch (error) {
      console.error(`Ошибка загрузки данных для фильтра ${filter.fullName}:`, error);
      this.setFallbackValues(filter);
    } finally {
      this.loadingFilters.delete(filter.id);
    }
  }

  private updateFilteredFilters(filterId: string, updatedFilter: Filter) {
    const filteredIndex = this.filteredFilters.findIndex(f => f.id === filterId);
    if (filteredIndex !== -1) {
      this.filteredFilters[filteredIndex] = updatedFilter;
    }
  }

  async loadRangeValues(filterId: string): Promise<void> {
    try {
      const requestBody = {
        filters: this.buildRequestFilters(filterId),
        sorts: [
          {
            field: "Value",
            sortType: 0
          }
        ],
        page: 0,
        pageSize: 1
      };

      const [minResponse, maxResponse] = await Promise.all([
        firstValueFrom(this.http.post<any>(this.apiUrl, requestBody)),
        firstValueFrom(this.http.post<any>(this.apiUrl, {
          ...requestBody,
          sorts: [{ field: "Value", sortType: 1 }]
        }))
      ]);

      if (minResponse.status === 0) {
        const minValue = this.extractNumericValue(minResponse.data?.[0]);
        const maxValue = this.extractNumericValue(maxResponse.data?.[0]);
        
        if (minValue !== null && maxValue !== null) {
          this.rangeValues[filterId] = {
            min: minValue,
            max: maxValue
          };
          this.rangeMinValues[filterId] = minValue;
          this.rangeMaxValues[filterId] = maxValue;
        }
      }
    } catch (error) {
      console.error(`Ошибка загрузки диапазона для фильтра ${filterId}:`, error);
      this.rangeValues[filterId] = { min: 0, max: 100 };
      this.rangeMinValues[filterId] = 0;
      this.rangeMaxValues[filterId] = 100;
    }
  }

  private extractNumericValue(data: any): number | null {
    if (!data) return null;
    
    // Пробуем разные поля
    const possibleFields = ['value', 'numericValue', 'minValue', 'maxValue', 'amount'];
    for (const field of possibleFields) {
      if (data[field] !== undefined && !isNaN(parseFloat(data[field]))) {
        return parseFloat(data[field]);
      }
    }
    
    // Если объект - число
    if (typeof data === 'number') return data;
    
    // Пробуем преобразовать строку
    if (typeof data === 'string') {
      const num = parseFloat(data);
      if (!isNaN(num)) return num;
    }
    
    return null;
  }

  private buildRequestFilters(filterId: string): any[] {
    const filters: any[] = [
      {
        field: 'ProductPropertyId',
        values: [filterId],
        type: 10
      }
    ];


    // Добавляем активные фильтры (кроме текущего)
    this.activeFilters
      .filter(f => f.filterId !== filterId)
      .forEach(activeFilter => {
        if (activeFilter.type === 'checkbox' && activeFilter.values) {
          filters.push({
            field: activeFilter.filterId,
            values: activeFilter.values,
            type: 0
          });
        } else if (activeFilter.type === 'range' && activeFilter.range) {
          filters.push({
            field: activeFilter.filterId,
            min: activeFilter.range.min,
            max: activeFilter.range.max,
            type: 1
          });
        }
      });

    return filters;
  }

  private setFallbackValues(filter: Filter): void {
    const index = this.filters.findIndex(f => f.id === filter.id);
    if (index === -1) return;

    if (filter.filterType === 0) {
      this.filters[index].uniqueValues = [];
    }
    
    this.loadedFilters.add(filter.id);
  }

  toggleMobileFilters() {
    this.isMobileOpen = !this.isMobileOpen;
    if (this.isMobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileFilters() {
    this.isMobileOpen = false;
    document.body.style.overflow = '';
  }

  filterFilters() {
    if (!this.searchQuery.trim()) {
      this.filteredFilters = [...this.filters];
      return;
    }
    
    const query = this.searchQuery.toLowerCase();
    this.filteredFilters = this.filters.filter(filter => 
      filter.fullName.toLowerCase().includes(query) ||
      filter.description.toLowerCase().includes(query)
    );
  }

  toggleFilterGroup(filterId: string) {
    if (this.loadingFilters.has(filterId)) return;
    
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
    if (this.loadingFilters.has(filter.id)) return;
    
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
    this.reloadOtherFilters(filter.id);
  }

  private async reloadOtherFilters(changedFilterId: string): Promise<void> {
    // Сбрасываем загруженные фильтры (кроме измененного)
    const otherFilters = this.filters
      .filter(f => f.id !== changedFilterId)
      .map(f => f.id);
    
    otherFilters.forEach(id => this.loadedFilters.delete(id));
    
    // Загружаем заново
    // await this.loadFiltersData();
  }

  isChecked(filterId: string, value: string): boolean {
    const activeFilter = this.activeFilters.find(f => f.filterId === filterId);
    return activeFilter?.values?.includes(value) || false;
  }

  getRangeMin(filter: Filter): number {
    return this.rangeValues[filter.id]?.min || 0;
  }

  getRangeMax(filter: Filter): number {
    return this.rangeValues[filter.id]?.max || 100;
  }

  getRangeStep(filter: Filter): number {
    const range = this.getRangeMax(filter) - this.getRangeMin(filter);
    if (range > 1000) return 10;
    if (range > 100) return 1;
    if (range > 10) return 0.1;
    return 0.01;
  }

  getRangeValue(filter: Filter, type: 'min' | 'max'): string {
    const value = this.rangeValues[filter.id]?.[type] || 0;
    const unit = filter.measurementUnit?.shortName || '';
    return `${value}${unit ? ' ' + unit : ''}`;
  }

  onRangeMinChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId)) return;
    
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    this.rangeMinValues[filterId] = value;
    
    // Обновляем rangeValues
    if (this.rangeValues[filterId]) {
      this.rangeValues[filterId].min = value;
      
      // Проверка чтобы min не был больше max
      if (value > this.rangeValues[filterId].max) {
        this.rangeValues[filterId].max = value;
        this.rangeMaxValues[filterId] = value;
      }
      
      this.updateRangeFilter(filter, this.rangeValues[filterId]);
      this.reloadOtherFilters(filter.id);
    }
  }

  onRangeMaxChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId)) return;
    
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    this.rangeMaxValues[filterId] = value;
    
    // Обновляем rangeValues
    if (this.rangeValues[filterId]) {
      this.rangeValues[filterId].max = value;
      
      // Проверка чтобы max не был меньше min
      if (value < this.rangeValues[filterId].min) {
        this.rangeValues[filterId].min = value;
        this.rangeMinValues[filterId] = value;
      }
      
      this.updateRangeFilter(filter, this.rangeValues[filterId]);
      this.reloadOtherFilters(filter.id);
    }
  }

  onRangeInputMinChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId)) return;
    
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    const minValue = this.getRangeMin(filter);
    const maxValue = this.getRangeMax(filter);
    
    const clampedValue = Math.max(minValue, Math.min(maxValue, value));
    
    this.rangeMinValues[filterId] = clampedValue;
    
    if (this.rangeValues[filterId]) {
      this.rangeValues[filterId].min = clampedValue;
      
      if (clampedValue > this.rangeValues[filterId].max) {
        this.rangeValues[filterId].max = clampedValue;
        this.rangeMaxValues[filterId] = clampedValue;
      }
      
      this.updateRangeFilter(filter, this.rangeValues[filterId]);
      this.reloadOtherFilters(filter.id);
    }
  }

  onRangeInputMaxChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId)) return;
    
    const input = event.target as HTMLInputElement;
    const value = parseFloat(input.value);
    
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    const minValue = this.getRangeMin(filter);
    const maxValue = this.getRangeMax(filter);
    
    const clampedValue = Math.max(minValue, Math.min(maxValue, value));
    
    this.rangeMaxValues[filterId] = clampedValue;
    
    if (this.rangeValues[filterId]) {
      this.rangeValues[filterId].max = clampedValue;
      
      if (clampedValue < this.rangeValues[filterId].min) {
        this.rangeValues[filterId].min = clampedValue;
        this.rangeMinValues[filterId] = clampedValue;
      }
      
      this.updateRangeFilter(filter, this.rangeValues[filterId]);
      this.reloadOtherFilters(filter.id);
    }
  }

  updateRangeFilter(filter: Filter, range: RangeValue) {
    const existingIndex = this.activeFilters.findIndex(f => f.filterId === filter.id);
    
    const defaultMin = this.getRangeMin(filter);
    const defaultMax = this.getRangeMax(filter);
    
    if (range.min === defaultMin && range.max === defaultMax) {
      if (existingIndex > -1) {
        this.activeFilters.splice(existingIndex, 1);
      }
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
    const range = this.rangeValues[filter.id];
    if (!range) return '0%';
    
    const min = this.getRangeMin(filter);
    const max = this.getRangeMax(filter);
    if (max === min) return '0%';
    
    const percentage = ((range.min - min) / (max - min)) * 100;
    return `${Math.min(Math.max(percentage, 0), 100)}%`;
  }

  getSelectedRangeRight(filter: Filter): string {
    const range = this.rangeValues[filter.id];
    if (!range) return '0%';
    
    const min = this.getRangeMin(filter);
    const max = this.getRangeMax(filter);
    if (max === min) return '0%';
    
    const percentage = ((max - range.max) / (max - min)) * 100;
    return `${Math.min(Math.max(percentage, 0), 100)}%`;
  }

  getFilterValueText(filter: ActiveFilter): string {
    if (filter.type === 'checkbox' && filter.values) {
      return filter.values.join(', ');
    } else if (filter.type === 'range' && filter.range) {
      return `${filter.range.min} - ${filter.range.max}`;
    }
    return '';
  }

  removeFilter(filter: ActiveFilter) {
    this.activeFilters = this.activeFilters.filter(f => f.filterId !== filter.filterId);
    
    if (filter.type === 'range') {
      const originalFilter = this.filters.find(f => f.id === filter.filterId);
      if (originalFilter) {
        this.rangeValues[filter.filterId] = {
          min: this.getRangeMin(originalFilter),
          max: this.getRangeMax(originalFilter)
        };
        this.rangeMinValues[filter.filterId] = this.getRangeMin(originalFilter);
        this.rangeMaxValues[filter.filterId] = this.getRangeMax(originalFilter);
      }
    }
    
    this.emitFiltersChange();
    this.reloadOtherFilters(filter.filterId);
  }

  clearAllFilters() {
    if (this.loadingFilters.size > 0) return;
    
    this.activeFilters = [];
    this.filters.forEach(filter => {
      if (filter.filterType === 1) {
        this.rangeValues[filter.id] = {
          min: this.getRangeMin(filter),
          max: this.getRangeMax(filter)
        };
        this.rangeMinValues[filter.id] = this.getRangeMin(filter);
        this.rangeMaxValues[filter.id] = this.getRangeMax(filter);
      }
    });
    this.emitFiltersChange();
    
    // Сбрасываем все загруженные фильтры и загружаем заново
    this.loadedFilters.clear();
    this.loadFiltersData();
  }

  showMore(filterId: string) {
    if (this.loadingFilters.has(filterId)) return;
    this.expandedFilters.add(filterId);
  }

  applyFilters() {
    if (this.loadingFilters.size > 0) return;
    
    this.filtersApplied.emit();
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
          field: filter.filterId,
          values: filter.values,
          type: 0
        };
      } else {
        return {
          field: filter.filterId,
          min: filter.range?.min,
          max: filter.range?.max,
          type: 1
        };
      }
    });
    
    this.filtersChange.emit(filters);
  }
}