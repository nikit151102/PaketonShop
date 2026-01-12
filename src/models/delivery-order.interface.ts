export interface DeliveryOrderCreateDto {
  addressId?: string;
  deliveryTypeId?: string;
  partnerInstanceId?: string;
  promoCodeId?: string;
  consultation?: boolean;
  orderDateTime?: string;
  userBasketId: string;
  orderStatus?: number;
  productPositionIds: string[];
}

export interface DeliveryOrderUpdateDto {
  id: string;
  addressId?: string;
  address?: AddressDto;
  deliveryTypeId?: string;
  partnerInstanceId?: string;
  promoCodeId?: string;
  consultation: boolean;
  orderDateTime: string;
  orderStatus?: number;
  productPositionIds: string[];
}

export interface AddressDto {
  country?: string;
  region?: string;
  area?: string;
  city?: string;
  street?: string;
  house?: string;
  housing?: string;
  floorNumber?: string;
  office?: string;
  postIndex?: string;
  latitude?: number;
  longitude?: number;
  system?: string;
}

export interface DeliveryOrder {
  id: string;
  userInstance: UserInstance;
  address: Address;
  deliveryType: DeliveryType;
  partnerInstance: PartnerInstance;
  promoCode?: PromoCode;
  consultation: boolean;
  orderDateTime: string;
  orderStatus: number;
  productCount: number;
  totalCostRetail: number;
  totalCostRetailDest: number;
  totalCostWholesale: number;
  totalCostWholesaleDest: number;
  deliveryCost: number;
  orderCost: number;
  productPositions: ProductPosition[];
}

export interface UserInstance {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  avatarUrl: string;
}

export interface Address {
  id: string;
  region: string;
  area?: string;
  city: string;
  street: string;
  house: string;
  housing?: string;
  floorNumber?: string;
  office?: string;
  postIndex: string;
  latitude?: number;
  longitude?: number;
  system?: string;
}

export interface DeliveryType {
  id: string;
  code: number;
  fullName: string;
  shortName: string;
}

export interface PartnerInstance {
  id: string;
  partner: Partner;
}

export interface Partner {
  id: string;
  shortName: string;
  fullName: string;
  inn: string;
  ogrn: string;
  email?: string;
}

export interface PromoCode {
  id: string;
  code: number;
  fullName: string;
  shortName: string;
  value: number;
  promoCodeType: number;
}

export interface ProductPosition {
  id: string;
  product: Product;
  userBasketId: string;
  count: number;
  price: number;
  totalCost: number;
}

export interface Product {
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
  productImageLink?: string;
}

export interface DeliveryOrderListResponse {
  message: string;
  status: number;
  data: DeliveryOrder[];
  breadCrumbs?: any[];
  page?: number;
  pageSize?: number;
  total?: number;
}

export interface DeliveryOrderDetailResponse {
  message: string;
  status: number;
  data: DeliveryOrder;
  breadCrumbs?: any[];
}

export interface DeliveryOrderCreateResponse {
  message: string;
  status: number;
  data: DeliveryOrder;
  breadCrumbs?: any[];
}

export interface DeliveryOrderUpdateResponse {
  message: string;
  status: number;
  data: DeliveryOrder;
  breadCrumbs?: any[];
}

export interface FilterParams {
  filters?: Filter[];
  sorts?: Sort[];
  page?: number;
  pageSize?: number;
}

export interface Filter {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in';
  value: any;
}

export interface Sort {
  field: string;
  direction: 'asc' | 'desc';
}