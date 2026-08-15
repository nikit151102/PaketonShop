export interface AuthResponseData {
  id: string;
  token: string;
  refreshToken: string;
  hoursOffset: number;
  isDeleted: boolean;
}

export interface AuthResponse {
  message: string;
  status: number;
  data: AuthResponseData;
  breadCrumbs: any;
}

export interface guestRegisterRequest {
  fingerprint: string;
  existingGuestToken: string;
}