/**
 * Ответ API при запросе списка товаров
 */
export interface ApiResponse {
  breadCrumbs: BreadCrumb[] | null; // Хлебные крошки для навигации (может быть null)
  data: Product[]; // Список найденных товаров
  message: string; // Сообщение от API 
  status: number; // HTTP-статус ответа 
}

/**
 * Элемент хлебных крошек
 */
export interface BreadCrumb {
  id: string; // Уникальный идентификатор
  name: string; // Название категории/раздела
  slug?: string; // ЧПУ-часть URL (если есть)
}

/**
 * Модель товара
 */
export interface Product {
  id: string; // Уникальный идентификатор товара
  idFrom1C: string; // Идентификатор товара из 1С
  article: string; // Артикул товара
  changeDateTime: string; // Дата последнего изменения товара
  createDateTime: string; // Дата создания товара
  depth: number; // Глубина (мм)
  description: string; // Полное описание товара
  fullName: string; // Полное имя товара для отображения
  grossWeight: number; // Вес брутто (г)
  h1Title: string; // Заголовок H1 для SEO
  height: number; // Высота (мм)
  imageInstances: ImageInstance[]; // Список изображений товара
  keywords: string; // SEO-ключевые слова
  manufacturer: string; // Производитель товара
  measurementUnit: MeasurementUnit; // Единицы измерения товара
  nameFrom1C: string; // Название товара из 1С
  packCount: number; // Количество единиц в упаковке
  priceChangeHistory: PriceChange[]; // История изменения цены
  productCategories: ProductCategory[]; // Категории товара
  productImageLinks: string[]; // Ссылки на изображения товара
  productKeyNames: ProductKeyName[]; // Дополнительные ключевые названия (синонимы)
  productProperties: ProductProperty[]; // Свойства товара (цвет, размер, материал и т.д.)
  remains: Remain[]; // Остатки на складах
  retailPrice: number; // Розничная цена
  retailPriceDest: number; // Розничная цена (с доставкой или НДС)
  saleType: string | null; // Тип продажи (например, "опт", "розница")
  shortName: string; // Короткое имя товара
  wholesalePrice: number; // Оптовая цена
  wholesalePriceDest: number; // Оптовая цена (с доставкой или НДС)
  width: number; // Ширина (мм)


  oldPrice?: number; 
  rating?: number;
  reviews?: number;
  badgeType?: string;
  badge?: string;
  favorite?: string;
  compare?: string;
}

/**
 * Единицы измерения товара
 */
export interface MeasurementUnit {
  id: string; // Уникальный ID единицы измерения
  code: number; // Код единицы измерения (например, 1 — "упак")
  name: string | null; // Полное название (может быть null)
  shortName: string; // Краткое название (например, "упак")
  coef: number; // Коэффициент пересчета
  createDateTime: string; // Дата создания
  changeDateTime: string; // Дата изменения
}

/**
 * Информация об изображении
 */
export interface ImageInstance {
  url: string; // Ссылка на изображение
  alt?: string; // Альтернативный текст для SEO (опционально)
}

/**
 * История изменения цены
 */
export interface PriceChange {
  // TODO: добавить поля при появлении данных
}

/**
 * Категории товара
 */
export interface ProductCategory {
  // TODO: добавить поля при появлении данных
}

/**
 * Дополнительные ключевые названия
 */
export interface ProductKeyName {
  // TODO: добавить поля при появлении данных
}

/**
 * Свойства товара
 */
export interface ProductProperty {
  // TODO: добавить поля при появлении данных
}

/**
 * Остаток товара на складе
 */
export interface Remain {
  quantity: number; // Количество товара в наличии
  warehouse?: string; // Название склада (если передано)
}
