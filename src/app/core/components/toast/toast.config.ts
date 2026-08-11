import { InjectionToken } from '@angular/core';
import { ToastConfig, ToastPosition } from './toast.model';

export interface ToastGlobalConfig {
  position: ToastPosition;
  duration: number;
  maxItems: number;
  showProgress: boolean;
  pauseOnHover: boolean;
  dismissible: boolean;
}

export const TOAST_CONFIG = new InjectionToken<ToastGlobalConfig>('TOAST_CONFIG');

export const DEFAULT_TOAST_CONFIG: ToastGlobalConfig = {
  position: 'top-right',
  duration: 3000,
  maxItems: 5,
  showProgress: true,
  pauseOnHover: true,
  dismissible: true,
};