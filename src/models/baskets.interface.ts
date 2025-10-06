/**
 * Интерфейс фильтрации
 */
export interface BasketFilter {
  /** Название поля для фильтрации */
  field: string;
  /** Массив значений фильтра */
  values: string[];
  /** Тип фильтра (0 - точное совпадение, 1 - содержит и т.д.) */
  type: number;
}

/**
 * Интерфейс сортировки
 */
export interface BasketSort {
  /** Название поля для сортировки */
  field: string;
  /** Тип сортировки (0 - ASC, 1 - DESC) */
  sortType: number;
}

/**
 * DTO для фильтрации корзин
 */
export interface FilterBasketsDto {
  filters: BasketFilter[];
  sorts: BasketSort[];
  page: number;
  pageSize: number;
}

/**
 * DTO для создания корзины
 */
export interface CreateBasketDto {
  /** Название корзины */
  name: string;
  /** Массив ID продуктов */
  products: string[];
}

/**
 * DTO для обновления корзины
 */
export interface UpdateBasketDto {
  id: string;
  userInstanceId: string;
  name: string;
  products: string[];
}

/**
 * DTO для добавления/удаления продукта
 */
export interface BasketProductDto {
  /** ID продукта */
  productId: string;
  /** ID корзины */
  basketId: string | null;
  /** Количество */
  count: number;
}

/**
 * Общий ответ API
 */
export interface ApiResponse<T> {
  message: string;
  status: number;
  data: T;
  breadCrumbs?: any[];
}

/**
 * Модель продукта внутри корзины
 */
export interface BasketProduct {
  id: string;
  count: number;
  product: {
    id: string;
    article: string;
    shortName: string;
    fullName: string;
    description: string;
    retailPrice: number;
    retailPriceDest: number;
    wholesalePrice: number;
    wholesalePriceDest: number;
    measurementUnitId: string;
    saleTypeId: string;
  };
  userBasketId: string;
}

/**
 * Модель корзины
 */
export interface UserBasket {
  id: string;
  name: string;
  userInstanceId: string;
  products: BasketProduct[];
  count: number;
}
