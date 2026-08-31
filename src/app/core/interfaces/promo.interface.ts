export interface PromoProduct {
  id: string;
  article: string;
  fullName: string;
  shortName?: string;
  description?: string;
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  productImageLink?: string;
  measurementUnitId?: string;
  isDeleted?: boolean;
}

export interface PromoOrder {
  id: string;
  salePercent: number;
  isRecountNeed: boolean;
  productId: string;
  product?: PromoProduct;
  promoOrderGroupId: string;
  isDeleted?: boolean;
}

export interface PromoOrderGroup {
  id: string;
  beginDateTime: string;
  endDateTime: string;
  description: string;
  promoOrders?: PromoOrder[];
  isDeleted?: boolean;
}

export interface FilterResponse<T> {
  message: string;
  status: number;
  pageCount: number;
  totalCount: number | null;
  page: number | null;
  pageSize: number | null;
  data: T[];
  breadCrumbs?: any;
  result?: any;
}