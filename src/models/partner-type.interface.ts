export interface PartnerType {
  id: string;                // Уникальный идентификатор в формате OID
  code: string;               // Код типа контрагента
  fullName: string;           // Полное наименование типа
  shortName: string;          // Краткое наименование типа
  createDateTime: Date
  changeDateTime: Date
}
