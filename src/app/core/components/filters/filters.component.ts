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
  hasMultipleValues?: boolean; // Флаг для проверки наличия нескольких значений
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

  private readonly STEP_PRECISION = 1;
  searchQuery: string = '';
  filteredFilters: Filter[] = []; // Будет содержать только фильтры с несколькими значениями
  allFilters: Filter[] = []; // Все фильтры (для внутреннего использования)
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

  // Храним оригинальные min/max значения для каждого фильтра
  private originalRangeMins: { [key: string]: number } = {};
  private originalRangeMaxs: { [key: string]: number } = {};

  // Для предотвращения повторных запросов
  private loadedFilters: Set<string> = new Set();
  private readonly apiUrl = `${environment.production}/api/Entities/ProductProperty/GetUniqueValues`;

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.checkMobile();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['filters'] && this.filters) {
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
    // Сохраняем все фильтры
    this.allFilters = [...this.filters];
    
    // Инициализируем filteredFilters позже, после загрузки данных
    this.filteredFilters = [];

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
        this.originalRangeMins[filter.id] = initialValue.min;
        this.originalRangeMaxs[filter.id] = initialValue.max;
      }
    });
  }

  /**
   * Фильтрует фильтры, оставляя только те, у которых больше одного значения
   */
  private filterFiltersByValueCount(): void {
    this.filteredFilters = this.allFilters.filter(filter => {
      // Для чекбокс фильтров проверяем количество уникальных значений
      if (filter.filterType === 0) {
        const uniqueValuesCount = filter.uniqueValues?.length || 0;
        // Сохраняем флаг для возможного использования в шаблоне
        filter.hasMultipleValues = uniqueValuesCount > 1;
        return uniqueValuesCount > 1;
      }
      
      // Для диапазонных фильтров всегда показываем (если есть диапазон)
      if (filter.filterType === 1) {
        return true;
      }
      
      return true;
    });

    console.log('Отфильтрованные фильтры (только с несколькими значениями):', 
      this.filteredFilters.map(f => ({
        name: f.fullName,
        valuesCount: f.uniqueValues?.length
      }))
    );
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
    
    // После загрузки всех данных фильтруем фильтры
    this.filterFiltersByValueCount();
  }

  async loadFilterData(filter: Filter): Promise<void> {
    if (this.loadingFilters.has(filter.id) || this.loadedFilters.has(filter.id)) return;

    this.loadingFilters.add(filter.id);

    try {

      const response = await firstValueFrom(
        this.http.get<ApiResponse>(`${this.apiUrl}/${filter.id}/${this.categoryId}`)
      );

      if (response.data) {
        const filterData: any = response.data;

        // Обновляем фильтр
        const index = this.allFilters.findIndex(f => f.id === filter.id);
        if (index !== -1) {
          // Сохраняем оригинальные данные, добавляем уникальные значения
          this.allFilters[index] = {
            ...this.allFilters[index],
            uniqueValues: filterData.uniqueValues || [],
            filterType: filterData.filterType || this.allFilters[index].filterType
          };

          // Для диапазонных фильтров загружаем min/max
          if (filterData.filterType === 1) {
            await this.loadRangeValues(filter.id);
          }
        }

        this.loadedFilters.add(filter.id);
      } else {
        // Если API не вернул данные, используем пустые значения
        this.setFallbackValues(filter);
      }
    } catch (error) {
      this.setFallbackValues(filter);
    } finally {
      this.loadingFilters.delete(filter.id);
    }
  }

  private setFallbackValues(filter: Filter): void {
    const index = this.allFilters.findIndex(f => f.id === filter.id);
    if (index === -1) return;

    if (filter.filterType === 0) {
      this.allFilters[index].uniqueValues = [];
    }

    this.loadedFilters.add(filter.id);
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
          // Убеждаемся, что min <= max
          const min = Math.min(minValue, maxValue);
          const max = Math.max(minValue, maxValue);

          this.rangeValues[filterId] = {
            min: min,
            max: max
          };
          this.rangeMinValues[filterId] = min;
          this.rangeMaxValues[filterId] = max;
          this.originalRangeMins[filterId] = min;
          this.originalRangeMaxs[filterId] = max;

          // Обновляем ползунки
          this.updateRangeSlider(filterId);
        }
      }
    } catch (error) {
      this.rangeValues[filterId] = { min: 0, max: 100 };
      this.rangeMinValues[filterId] = 0;
      this.rangeMaxValues[filterId] = 100;
      this.originalRangeMins[filterId] = 0;
      this.originalRangeMaxs[filterId] = 100;
      this.updateRangeSlider(filterId);
    }
  }

  private extractNumericValue(data: any): number | null {
    if (!data) return null;

    // Пробуем разные поля
    const possibleFields = ['value', 'numericValue', 'minValue', 'maxValue', 'amount'];
    for (const field of possibleFields) {
      if (data[field] !== undefined && !isNaN(parseFloat(data[field]))) {
        return Math.round(parseFloat(data[field]));
      }
    }

    if (typeof data === 'number') return Math.round(data);
    if (typeof data === 'string') {
      const num = parseFloat(data);
      if (!isNaN(num)) return Math.round(num);
    }

    return null;
  }

  private updateRangeSlider(filterId: string) {
    setTimeout(() => {
      const minInput = document.querySelector(`.range-min[data-filter-id="${filterId}"]`) as HTMLInputElement;
      const maxInput = document.querySelector(`.range-max[data-filter-id="${filterId}"]`) as HTMLInputElement;

      if (minInput) {
        minInput.value = this.rangeMinValues[filterId]?.toString() || this.originalRangeMins[filterId]?.toString() || '0';
      }
      if (maxInput) {
        maxInput.value = this.rangeMaxValues[filterId]?.toString() || this.originalRangeMaxs[filterId]?.toString() || '100';
      }

      // Принудительно обновляем выделенную область
      this.updateRangeSelection(filterId);
    }, 0);
  }

  private updateRangeSelection(filterId: string) {
    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    // Это вызовет пересчет стилей через getSelectedRangeLeft/Right
    const left = this.getSelectedRangeLeft(filter);
    const right = this.getSelectedRangeRight(filter);
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
      // Если поиск пустой, показываем все отфильтрованные фильтры
      this.filteredFilters = this.allFilters.filter(filter => {
        if (filter.filterType === 0) {
          return (filter.uniqueValues?.length || 0) > 1;
        }
        return true;
      });
      return;
    }

    const query = this.searchQuery.toLowerCase();
    // Поиск только среди фильтров с несколькими значениями
    this.filteredFilters = this.allFilters.filter(filter => {
      // Проверяем, что фильтр имеет несколько значений
      if (filter.filterType === 0 && (filter.uniqueValues?.length || 0) <= 1) {
        return false;
      }
      
      // Проверяем совпадение с поиском
      return filter.fullName.toLowerCase().includes(query) ||
             filter.description.toLowerCase().includes(query);
    });
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

    // После перезагрузки других фильтров, снова фильтруем
    setTimeout(() => {
      this.filterFiltersByValueCount();
    }, 500);
  }

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
    const range = this.getRangeMax(filter) - this.getRangeMin(filter);
    if (range > 1000) return 10;
    if (range > 100) return 1;
    return 1;
  }

  getRangeValue(filter: Filter, type: 'min' | 'max'): string {
    const value = type === 'min'
      ? this.rangeMinValues[filter.id]
      : this.rangeMaxValues[filter.id];

    const displayValue = value !== undefined ? value : this.getRangeMin(filter);
    const unit = filter.measurementUnit?.shortName || '';
    return `${displayValue}${unit ? ' ' + unit : ''}`;
  }

  onRangeMinChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId)) return;

    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);

    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    // Округляем до целого числа
    value = Math.round(value);

    const maxValue = this.rangeMaxValues[filterId] !== undefined
      ? this.rangeMaxValues[filterId]
      : this.getRangeMax(filter);

    const minValue = this.getRangeMin(filter);

    // Убеждаемся, что значение в допустимых пределах
    value = Math.max(minValue, Math.min(value, maxValue));

    // Обновляем значения
    this.rangeMinValues[filterId] = value;

    if (this.rangeValues[filterId]) {
      this.rangeValues[filterId].min = value;
    }

    // Обновляем input value для синхронизации
    input.value = value.toString();

    this.updateRangeFilter(filter, this.rangeValues[filterId] || { min: value, max: maxValue });
    this.emitFiltersChange();
    this.reloadOtherFilters(filter.id);

    // Обновляем выделенную область
    this.updateRangeSelection(filterId);
  }

  onRangeMaxChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId)) return;

    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);

    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    // Округляем до целого числа
    value = Math.round(value);

    const minValue = this.rangeMinValues[filterId] !== undefined
      ? this.rangeMinValues[filterId]
      : this.getRangeMin(filter);

    const maxValue = this.getRangeMax(filter);

    // Убеждаемся, что значение в допустимых пределах
    value = Math.max(minValue, Math.min(value, maxValue));

    // Обновляем значения
    this.rangeMaxValues[filterId] = value;

    if (this.rangeValues[filterId]) {
      this.rangeValues[filterId].max = value;
    }

    // Обновляем input value для синхронизации
    input.value = value.toString();

    this.updateRangeFilter(filter, this.rangeValues[filterId] || { min: minValue, max: value });
    this.emitFiltersChange();
    this.reloadOtherFilters(filter.id);

    // Обновляем выделенную область
    this.updateRangeSelection(filterId);
  }

  onRangeInputMinChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId)) return;

    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);

    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    // Проверяем на NaN
    if (isNaN(value)) {
      value = this.getRangeMin(filter);
    }

    // Округляем до целого числа
    value = Math.round(value);

    const minValue = this.getRangeMin(filter);
    const currentMax = this.rangeMaxValues[filterId] !== undefined
      ? this.rangeMaxValues[filterId]
      : this.getRangeMax(filter);

    // Проверяем и корректируем значение
    const clampedValue = Math.max(minValue, Math.min(currentMax, value));

    // Обновляем значения
    this.rangeMinValues[filterId] = clampedValue;

    if (this.rangeValues[filterId]) {
      this.rangeValues[filterId].min = clampedValue;
    }

    // Обновляем оба input для синхронизации
    const minRangeInput = document.querySelector(`.range-min[data-filter-id="${filterId}"]`) as HTMLInputElement;
    if (minRangeInput) {
      minRangeInput.value = clampedValue.toString();
    }

    // Обновляем текстовый input
    input.value = clampedValue.toString();

    this.updateRangeFilter(filter, this.rangeValues[filterId] || { min: clampedValue, max: currentMax });
    this.emitFiltersChange();
    this.reloadOtherFilters(filter.id);

    // Обновляем выделенную область
    this.updateRangeSelection(filterId);
  }

  onRangeInputMaxChange(filterId: string, event: Event) {
    if (this.loadingFilters.has(filterId)) return;

    const input = event.target as HTMLInputElement;
    let value = parseFloat(input.value);

    const filter = this.filters.find(f => f.id === filterId);
    if (!filter) return;

    // Проверяем на NaN
    if (isNaN(value)) {
      value = this.getRangeMax(filter);
    }

    // Округляем до целого числа
    value = Math.round(value);

    const maxValue = this.getRangeMax(filter);
    const currentMin = this.rangeMinValues[filterId] !== undefined
      ? this.rangeMinValues[filterId]
      : this.getRangeMin(filter);

    // Проверяем и корректируем значение
    const clampedValue = Math.max(currentMin, Math.min(maxValue, value));

    // Обновляем значения
    this.rangeMaxValues[filterId] = clampedValue;

    if (this.rangeValues[filterId]) {
      this.rangeValues[filterId].max = clampedValue;
    }

    // Обновляем оба input для синхронизации
    const maxRangeInput = document.querySelector(`.range-max[data-filter-id="${filterId}"]`) as HTMLInputElement;
    if (maxRangeInput) {
      maxRangeInput.value = clampedValue.toString();
    }

    // Обновляем текстовый input
    input.value = clampedValue.toString();

    this.updateRangeFilter(filter, this.rangeValues[filterId] || { min: currentMin, max: clampedValue });
    this.emitFiltersChange();
    this.reloadOtherFilters(filter.id);

    // Обновляем выделенную область
    this.updateRangeSelection(filterId);
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
    const min = this.getRangeMin(filter);
    const max = this.getRangeMax(filter);
    const currentMin = this.rangeMinValues[filter.id] !== undefined
      ? this.rangeMinValues[filter.id]
      : min;

    if (max === min) return '0%';

    const percentage = ((currentMin - min) / (max - min)) * 100;
    return `${Math.min(Math.max(percentage, 0), 100)}%`;
  }

  getSelectedRangeRight(filter: Filter): string {
    const min = this.getRangeMin(filter);
    const max = this.getRangeMax(filter);
    const currentMax = this.rangeMaxValues[filter.id] !== undefined
      ? this.rangeMaxValues[filter.id]
      : max;

    if (max === min) return '0%';

    const percentage = ((max - currentMax) / (max - min)) * 100;
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
        const defaultMin = this.getRangeMin(originalFilter);
        const defaultMax = this.getRangeMax(originalFilter);

        this.rangeValues[filter.filterId] = {
          min: defaultMin,
          max: defaultMax
        };
        this.rangeMinValues[filter.filterId] = defaultMin;
        this.rangeMaxValues[filter.filterId] = defaultMax;

        // Обновляем ползунки
        this.updateRangeSlider(filter.filterId);
      }
    }

    this.emitFiltersChange();
    this.reloadOtherFilters(filter.filterId);
  }

  clearAllFilters() {
    if (this.loadingFilters.size > 0) {
      this.closeMobileFilters();
      return;
    }

    this.activeFilters = [];
    this.closeMobileFilters();

    this.filters.forEach(filter => {
      if (filter.filterType === 1) {
        const defaultMin = this.getRangeMin(filter);
        const defaultMax = this.getRangeMax(filter);

        this.rangeValues[filter.id] = {
          min: defaultMin,
          max: defaultMax
        };
        this.rangeMinValues[filter.id] = defaultMin;
        this.rangeMaxValues[filter.id] = defaultMax;

        // Обновляем ползунки
        this.updateRangeSlider(filter.id);
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
          field: filter.filterName,
          values: filter.values,
          type: 0
        };
      } else {
        return {
          field: filter.filterName,
          min: filter.range?.min,
          max: filter.range?.max,
          type: 1
        };
      }
    });

    this.filtersChange.emit(filters);
  }
}