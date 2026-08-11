export interface ContractorDetails {
  id: string;
  shortName: string;
  fullName: string;
  inn: string;
  ogrn: string;
  kpp: string;
  lastName?: string;
  firstName?: string;
  middleName?: string;
  korAccount?: string;
  workDirection?: string;
  phoneNumber?: string;
  email?: string;
  address?: {
    region: string;
    city: string;
    street: string;
    house: string;
    postIndex: string;
  };
  partnerType?: {
    id: string;
    code: number;
    fullName: string;
    shortName: string;
  };
}

export interface BusinessAccountData {
  user: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName: string;
    birthday: string;
    phoneNumber: string;
  };
  company: {
    id?: string;
    fullName: string;
    shortName: string;
    inn: string;
    ogrn: string;
    kpp: string;
    partnerTypeId: string;
    workDirection: string;
    registrationDate?: Date;
    address: {
      country: string;
      region: string;
      city: string;
      street: string;
      house: string;
      postIndex: string;
    };
  };
  documents: DocumentData[];
}

export interface DocumentData {
  type: number;
  file: File;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export interface PartnerType {
  id: string;
  code: number;
  fullName: string;
  shortName: string;
}

export interface Partner {
  id: string;
  fullName: string;
  shortName: string;
  inn: string;
  ogrn: string;
  kpp: string;
  workDirection: string;
  partnerType: PartnerType;
  address: {
    country: string;
    region: string;
    city: string;
    street: string;
    house: string;
    postIndex: string;
  };
  phoneNumber?: string;
  email?: string;
  bank?: {
    id: string;
    bik: string;
    partner: {
      shortName: string;
      fullName: string;
    };
  };
}

export interface FieldError {
  field: string;
  message: string;
}
