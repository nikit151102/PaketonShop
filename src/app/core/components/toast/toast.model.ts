export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export type ToastPosition =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'top-center'
  | 'bottom-center';

export interface ToastConfig {
  id?: string;
  title?: string;
  message: string;
  type?: ToastType;
  duration?: number;
  position?: ToastPosition;
  dismissible?: boolean;
  showProgress?: boolean;
  pauseOnHover?: boolean;
  action?: { label: string; onClick: () => void };
}

export interface ToastInternal extends Required<Omit<ToastConfig, 'id' | 'action'>> {
  id: string;
  createdAt: number;
  action?: ToastConfig['action'];
  state: 'enter' | 'visible' | 'exit';
  paused: boolean;
  remaining: number;
}

export interface ToastRef {
  id: string;
  close: () => void;
  onAction: Promise<void>;
}