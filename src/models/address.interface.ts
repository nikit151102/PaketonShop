/**
 * Интерфейс, описывающий адрес
 */
export interface Address {
    id: string;                     // Уникальный идентификатор адреса
    region: string;                 // Название региона (обязательное поле)
    area?: string | null;           // Название области/района (необязательное)
    city: string;                   // Название города (обязательное)
    street: string;                 // Название улицы (обязательное)
    house: string;                  // Номер дома (обязательное)
    housing?: string | null;        // Корпус/строение (необязательное)
    postIndex: string;              // Почтовый индекс (обязательное)
      floorNumber?: string;
     office?: string;
    gps?: string | null;            // GPS-координаты в формате строки (необязательное)
    latitude?: number | null;       // Географическая широта (необязательное)
    longitude?: number | null;      // Географическая долгота (необязательное)
      system?: string;
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