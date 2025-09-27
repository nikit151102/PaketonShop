/**
 * Интерфейс, описывающий адрес
 */
export interface Address {
    id?: string;
    creatorId?: string;
    country?: string;
    region: string;
    area: string;
    city: string;
    street: string;
    house: string;
    housing?: string;
    floorNumber?: string;
    office?: string;
    postIndex?: string;
    latitude?: number;
    longitude?: number;
    system?: string;
    createDateTime?: string;
    changeDateTime?: string;
}

export interface ApiResponse<T> {
    message: string;
    status: number;
    data: T;
    breadCrumbs?: any;
}

/**
 * Интерфейс, описывающий тип доставки
 */
export interface DeliveryType {
    id: number;                     // Уникальный идентификатор типа доставки
    fullName: string;               // Полное название типа доставки (например, "Курьерская доставка")
    shortName: string;              // Краткое название типа доставки (например, "Курьер")
}

/**
 * Интерфейс, описывающий адрес доставки
 */
export interface AddressInstance {
    id: number;                     // Уникальный идентификатор адреса доставки
    floorNumber?: number | null;    // Номер этажа (необязательное)
    office?: string | null;         // Номер квартиры/офиса (необязательное)
    addressId: number;              // ID связанного адреса (обязательное)
    address?: Address;              // Полные данные адреса (необязательное, может подгружаться дополнительно)
    deliveryTypeId: number;         // ID типа доставки (обязательное)
    deliveryType?: DeliveryType;    // Данные типа доставки (необязательное, может подгружаться дополнительно)
}