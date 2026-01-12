/**
 * Ответ API при запросе списка товаров
 */
export interface ApiResponse {
  breadCrumbs: BreadCrumb[] | null; // Хлебные крошки для навигации (может быть null)
  data: ProductsData; // Данные о товарах
  message: string; // Сообщение от API
  status: number; // HTTP-статус ответа
}

/**
 * Данные о товарах с пагинацией
 */
export interface ProductsData {
  items: Product[]; // Список найденных товаров
  totalItems: number; // Общее количество товаров
  page: number; // Текущая страница
  pageSize: number; // Размер страницы
  totalPages: number; // Общее количество страниц
  hasNextPage: boolean; // Есть ли следующая страница
  hasPreviousPage: boolean; // Есть ли предыдущая страница
}

/**
 * Элемент хлебных крошек
 */
export interface BreadCrumb {
  id: string; // Уникальный идентификатор
  name: string; // Название категории/раздела
  slug?: string; // ЧПУ-часть URL (если есть)
  url?: string; // Полный URL категории
  parentId?: string | null; // ID родительской категории
  level?: number; // Уровень вложенности
}

/**
 * Модель товара
 */
export interface Product {
  // Основная информация
  id: string; // Уникальный идентификатор товара
  idFrom1C: string; // Идентификатор товара из 1С
  article: string; // Артикул товара
  changeDateTime: string; // Дата последнего изменения товара
  createDateTime: string; // Дата создания товара
  
  // Размеры и вес
  depth: number; // Глубина (мм)
  height: number; // Высота (мм)
  width: number; // Ширина (мм)
  grossWeight: number; // Вес брутто (г)
  netWeight?: number; // Вес нетто (г)
  volume?: number; // Объем (мл или л)
  
  // Описание
  description: string; // Полное описание товара
  shortDescription?: string; // Краткое описание для списков
  fullName: string; // Полное имя товара для отображения
  shortName: string; // Короткое имя товара
  nameFrom1C: string; // Название товара из 1С
  
  // SEO
  h1Title: string; // Заголовок H1 для SEO
  metaTitle?: string; // Meta Title
  metaDescription?: string; // Meta Description
  keywords: string; // SEO-ключевые слова
  slug?: string; // ЧПУ URL товара
  
  // Изображения
  imageInstances: ImageInstance[]; // Список изображений товара
  productImageLinks: string[]; // Ссылки на изображения товара
  thumbnailUrl?: string; // URL миниатюры товара
  mainImage?: ImageInstance; // Главное изображение товара
  
  // Цены
  retailPrice: number; // Розничная цена
  retailPriceDest: number; // Розничная цена (с доставкой или НДС)
  wholesalePrice: number; // Оптовая цена
  wholesalePriceDest: number; // Оптовая цена (с доставкой или НДС)
  discountPrice?: number; // Цена со скидкой
  discountPercent?: number; // Процент скидки
  oldPrice?: number; // Старая цена (для отображения скидки)
  priceChangeHistory: PriceChange[]; // История изменения цены
  viewPrice?: number; // Цена для отображения (может отличаться от retailPrice)
  
  // Производитель и измерения
  manufacturer: string; // Производитель товара
  brand?: string; // Бренд
  measurementUnit: MeasurementUnit; // Единицы измерения товара
  packCount: number; // Количество единиц в упаковке
  minOrderQuantity?: number; // Минимальное количество для заказа
  boxQuantity?: number; // Количество в коробке
  
  // Категории и свойства
  productCategories: ProductCategory[]; // Категории товара
  mainProductCategoryId?: string; // ID основной категории
  productKeyNames: ProductKeyName[]; // Дополнительные ключевые названия (синонимы)
  productProperties: ProductProperty[]; // Свойства товара (цвет, размер, материал и т.д.)
  
  // Наличие и остатки
  remains: Remain[]; // Остатки на складах
  totalRemains: number; // Общее количество на всех складах
  isInStock: boolean; // Есть ли в наличии
  lowStockThreshold?: number; // Порог низкого остатка
  
  // Продажи и статусы
  saleType: string | null; // Тип продажи (например, "опт", "розница")
  isNew?: boolean; // Новинка
  isPopular?: boolean; // Популярный товар
  isRecommended?: boolean; // Рекомендуемый товар
  isBestseller?: boolean; // Хит продаж
  rating?: number; // Рейтинг товара (0-5)
  reviewsCount?: number; // Количество отзывов
  soldCount?: number; // Количество проданных единиц
  viewsCount?: number; // Количество просмотров
  
  // Дополнительные флаги
  isActive?: boolean; // Активен ли товар
  isDeleted?: boolean; // Удален ли товар
  hasVariants?: boolean; // Есть ли варианты товара
  isFavorite?: boolean; // В избранном у пользователя
  inCart?: boolean; // В корзине у пользователя
  compare?: boolean; // В сравнении у пользователя
  
  // Гарантии и доставка
  warrantyMonths?: number; // Гарантия в месяцах
  deliveryTime?: number; // Срок доставки в днях
  deliveryOptions?: DeliveryOption[]; // Варианты доставки
  
  // Теги и бейджи
  tags?: string[]; // Теги товара
  badges?: ProductBadge[]; // Бейджи товара
  
  // Связанные товары
  relatedProducts?: RelatedProduct[]; // Связанные товары
  accessories?: Product[]; // Аксессуары
  
  // Документы
  documents?: ProductDocument[]; // Документы (сертификаты, инструкции)
  
  // Видео
  videoUrl?: string; // URL видео-обзора
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
  description?: string; // Описание единицы измерения
  isActive?: boolean; // Активна ли единица измерения
}

/**
 * Информация об изображении
 */
export interface ImageInstance {
  id?: string; // Уникальный ID изображения
  url: string; // Ссылка на изображение
  alt?: string; // Альтернативный текст для SEO (опционально)
  title?: string; // Заголовок изображения
  type?: 'main' | 'gallery' | 'thumbnail' | 'additional'; // Тип изображения
  order?: number; // Порядок отображения
  width?: number; // Ширина изображения
  height?: number; // Высота изображения
  size?: number; // Размер файла в байтах
  mimeType?: string; // MIME тип (image/jpeg, image/png и т.д.)
}

/**
 * История изменения цены
 */
export interface PriceChange {
  id: string; // Уникальный ID изменения
  oldPrice: number; // Старая цена
  newPrice: number; // Новая цена
  changeDate: string; // Дата изменения
  changeReason?: string; // Причина изменения
  userId?: string; // ID пользователя, изменившего цену
  userName?: string; // Имя пользователя
}

/**
 * Категории товара
 */
export interface ProductCategory {
  id: string; // Уникальный ID категории
  name: string; // Название категории
  slug?: string; // ЧПУ категории
  parentId?: string | null; // ID родительской категории
  level?: number; // Уровень вложенности
  order?: number; // Порядок сортировки
  isActive?: boolean; // Активна ли категория
  imageUrl?: string; // Изображение категории
  description?: string; // Описание категории
  productCount?: number; // Количество товаров в категории
  children?: ProductCategory[]; // Подкатегории
  path?: string[]; // Путь от корня
  seoData?: CategorySEO; // SEO данные категории
}

/**
 * SEO данные категории
 */
export interface CategorySEO {
  metaTitle?: string;
  metaDescription?: string;
  h1?: string;
  canonicalUrl?: string;
  keywords?: string[];
}

/**
 * Дополнительные ключевые названия
 */
export interface ProductKeyName {
  id: string; // Уникальный ID
  keyName: string; // Ключевое название
  language?: string; // Язык (ru, en и т.д.)
  isPrimary?: boolean; // Основное ли название
}

/**
 * Свойства товара
 */
export interface ProductProperty {
  id: string; // Уникальный ID свойства
  name: string; // Название свойства
  value: string | number | boolean; // Значение свойства
  type: 'string' | 'number' | 'boolean' | 'color' | 'size' | 'material'; // Тип свойства
  unit?: string; // Единица измерения
  group?: string; // Группа свойств
  order?: number; // Порядок отображения
  isFilterable?: boolean; // Можно ли фильтровать по этому свойству
  isVisible?: boolean; // Видимо ли свойство
  values?: string[]; // Возможные значения (для фильтров)
}

/**
 * Остаток товара на складе
 */
export interface Remain {
  id: string; // Уникальный ID остатка
  productInstanceId: string; // ID экземпляра товара
  warehouseId: string; // ID склада
  warehouseName: string; // Название склада
  warehouseAddress?: string; // Адрес склада
  warehouseCity?: string; // Город склада
  warehousePhone?: string; // Телефон склада
  warehouseEmail?: string; // Email склада
  quantity: number; // Количество товара в наличии
  reservedQuantity?: number; // Зарезервированное количество
  availableQuantity: number; // Доступное количество (quantity - reserved)
  lastUpdated: string; // Дата последнего обновления
  isActive?: boolean; // Активен ли склад
  coordinates?: { // Координаты склада
    latitude?: number;
    longitude?: number;
  };
  productPlaceName: string;
  count: number;
}

/**
 * Опция доставки
 */
export interface DeliveryOption {
  id: string; // Уникальный ID
  name: string; // Название способа доставки
  description?: string; // Описание
  price: number; // Стоимость доставки
  freeFrom?: number; // Бесплатно от суммы
  deliveryTime: string; // Срок доставки (например, "1-3 дня")
  isActive: boolean; // Активна ли доставка
  type: 'pickup' | 'courier' | 'post' | 'transport'; // Тип доставки
  pickupPoints?: PickupPoint[]; // Пункты самовывоза
}

/**
 * Пункт самовывоза
 */
export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  workHours?: string;
  coordinates?: {
    latitude?: number;
    longitude?: number;
  };
}

/**
 * Бейдж товара
 */
export interface ProductBadge {
  type: 'new' | 'sale' | 'hit' | 'recommended' | 'limited' | 'eco' | 'premium'; // Тип бейджа
  text: string; // Текст бейджа
  color?: string; // Цвет бейджа
  backgroundColor?: string; // Цвет фона
  icon?: string; // Иконка
}

/**
 * Связанный товар
 */
export interface RelatedProduct {
  id: string;
  article: string;
  name: string;
  price: number;
  oldPrice?: number;
  imageUrl?: string;
  relationType: 'similar' | 'accessory' | 'alternative' | 'bundle'; // Тип связи
}

/**
 * Документ товара
 */
export interface ProductDocument {
  id: string;
  name: string;
  type: 'certificate' | 'manual' | 'specification' | 'warranty'; // Тип документа
  url: string;
  size?: number;
  format?: string;
  language?: string;
}

/**
 * Вариант товара (для товаров с вариантами)
 */
export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;
  color?: string;
  size?: string;
  material?: string;
  price: number;
  oldPrice?: number;
  stock: number;
  imageUrl?: string;
  barcode?: string;
  isDefault?: boolean;
  properties?: VariantProperty[];
}

/**
 * Свойство варианта
 */
export interface VariantProperty {
  name: string;
  value: string;
  type: 'color' | 'size' | 'material' | 'other';
}

/**
 * Фильтры для поиска товаров
 */
export interface ProductFilters {
  categories?: string[]; // ID категорий
  priceMin?: number; // Минимальная цена
  priceMax?: number; // Максимальная цена
  brands?: string[]; // Бренды
  properties?: FilterProperty[]; // Свойства для фильтрации
  inStock?: boolean; // Только в наличии
  isNew?: boolean; // Новинки
  isSale?: boolean; // Товары со скидкой
  sortBy?: 'price' | 'name' | 'rating' | 'newest' | 'popular'; // Поле сортировки
  sortOrder?: 'asc' | 'desc'; // Порядок сортировки
  searchQuery?: string; // Поисковый запрос
}

/**
 * Свойство для фильтрации
 */
export interface FilterProperty {
  id: string;
  values: (string | number | boolean)[];
  type: 'string' | 'number' | 'boolean' | 'range';
}

/**
 * Запрос на получение товаров
 */
export interface ProductsRequest {
  filters?: ProductFilters;
  page?: number;
  pageSize?: number;
  include?: string[]; // Какие данные включать (например, ['properties', 'categories', 'remains'])
}

/**
 * Ответ на запрос товаров с пагинацией
 */
export interface ProductsResponse {
  data: Product[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  breadCrumbs?: BreadCrumb[];
  filters?: {
    categories?: ProductCategory[];
    brands?: string[];
    priceRange?: {
      min: number;
      max: number;
    };
    properties?: ProductProperty[];
  };
}

/**
 * Данные для отображения товара в списке (упрощенная версия)
 */
export interface ProductListItem {
  id: string;
  article: string;
  name: string;
  shortName?: string;
  price: number;
  oldPrice?: number;
  discountPercent?: number;
  imageUrl?: string;
  rating?: number;
  reviewsCount?: number;
  isNew?: boolean;
  isBestseller?: boolean;
  isFavorite?: boolean;
  inCart?: boolean;
  badges?: ProductBadge[];
  isInStock: boolean;
  minPrice?: number;
  maxPrice?: number;
  hasVariants?: boolean;
}

/**
 * Корзина пользователя
 */
export interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  article: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  measurementUnit?: MeasurementUnit;
  packCount?: number;
  maxQuantity?: number;
  properties?: {
    name: string;
    value: string;
  }[];
}