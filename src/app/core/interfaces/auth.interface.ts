export interface User {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string | null;
  userName: string;
  token: string;
  createDateTime: string;
  changeDateTime: string;
  hoursOffset: number;
}

export interface AuthResponse {
  message: string;
  status: number;
  data: User;
  breadCrumbs: any;
}

export interface AuthResponse {
  message: string;
  status: number;
  data: User;
  breadCrumbs: any;
}

export interface guestRegisterRequest {
  fingerprint: string;
  existingGuestToken: string;
}

