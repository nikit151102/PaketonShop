// Базовые интерфейсы
export interface Address {
  id: string;
  region: string;
  area: string;
  city: string;
  street: string;
  house: string;
  housing: string | null;
  floorNumber: string;
  office: string;
  postIndex: string;
  latitude: number;
  longitude: number;
  system: string;
}

export interface WorkingHours {
  id: string;
  dateTime: string | null;
  dayOfWeek: number; // 0 - Sunday, 1 - Monday, etc.
  openTime: string; // format: "HH:mm:ss"
  closeTime: string; // format: "HH:mm:ss"
}

export interface ExceptionDay {
  id: string;
  date: string; // format: "YYYY-MM-DD"
  isClosed: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export interface StoreSchedule {
  id: string;
  storeId: string;
  workingHours: WorkingHours[];
  exceptionDays: ExceptionDay[];
}

export interface Partner {
  id: string;
  shortName: string;
  fullName: string;
  inn: string;
  ogrn: string;
  email: string;
}

// Основной интерфейс точки реализации
export interface ProductPlace {
  id: string;
  shortName: string;
  fullName: string;
  address: Address;
  partner: Partner | null;
  storeSchedule: StoreSchedule;
  // Добавляем недостающие свойства
  value?: string; // для совместимости с shop.interface.ts
  addressId?: string; // для совместимости с shop.interface.ts
}

// Для фильтрации и пагинации
export interface QueryDto {
  filters: Array<{
    propertyName: string;
    value: any;
    comparison: 'Equals' | 'Contains' | 'GreaterThan' | 'LessThan' | 'StartsWith' | 'EndsWith';
  }>;
  sorts: Array<{
    propertyName: string;
    direction: 'Ascending' | 'Descending';
  }>;
  page: number;
  pageSize: number;
}

// Ответ от API
export interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
  breadCrumbs: any[] | null;
}

// Расширенный ответ для списка
export interface ProductPlaceListResponse extends ApiResponse<ProductPlace[]> {
  data: ProductPlace[];
}

// Ответ для одной точки
export interface ProductPlaceDetailResponse extends ApiResponse<ProductPlace> {
  data: ProductPlace;
}

// Интерфейс для параметров фильтрации
export interface ProductPlaceFilterParams {
  city?: string;
  region?: string;
  isActive?: boolean;
  searchText?: string;
}

// Интерфейс для работы с графиком
export interface StoreHoursInfo {
  dayOfWeek: number;
  dayName: string;
  openTime: string;
  closeTime: string;
  isWorkingDay: boolean;
  isToday: boolean;
}

export interface TodaySchedule {
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  exception?: ExceptionDay;
}

// Утилитарные интерфейсы
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface StoreDistance extends ProductPlace {
  distance?: number; // Расстояние в метрах
  travelTime?: number; // Время в минутах
}

// Интерфейс для формы поиска
export interface StoreSearchForm {
  city: string;
  searchRadius: number; // в км
  showOnlyOpen: boolean;
  services: string[];
}