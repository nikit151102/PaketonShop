// Интерфейс для одного товара
export interface FavoriteProduct {
    createDateTime: string;
    changeDateTime: string;
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
}

// Интерфейс для ответа сервера
export interface FavoriteResponse {
    message: string;
    status: number;
    data: FavoriteProduct[];
    breadCrumbs: string[];
}

// Интерфейс фильтра (можно дополнять)
export interface FavoriteFilterRequest {
    page: number;
    pageSize: number;
}