// measurementUnit (единица измерения)
export interface MeasurementUnit {
  id: string;
  code: number;
  code1c: string | null;
  coef: number;
  denominator: number;
  internationalCode: string | null;
  isDeleted: boolean;
  name: string | null;
  numerator: number;
  shortName: string;
}

// productInstance (товар)
export interface ProductInstance {
  id: string;
  article: string;
  fullName: string;
  isDeleted: boolean;
  productImageLink: string;
  representationFrom1C: string;
}

// productBarCodes (баркод)
export interface productBarCodes {
  barCode: string;
  coefficient: number;
  id: string;
  isDeleted: boolean;
  measurementUnit: MeasurementUnit;
  productInstance: ProductInstance;
}