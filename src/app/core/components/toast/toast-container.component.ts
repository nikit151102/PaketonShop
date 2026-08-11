import { Component, input } from '@angular/core';
import { NgClass, NgFor } from '@angular/common';
import { ToastComponent } from './toast.component';
import { ToastInternal, ToastPosition } from './toast.model';
import { Signal } from '@angular/core';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgFor, NgClass, ToastComponent],
  template: `
    <div class="toast-stack" [ngClass]="positionClass()">
      @for (toast of toasts(); track toast.id) {
        <app-toast
          [toast]="toast"
          (close)="onClose(toast.id)"
          (pause)="onPause(toast.id)"
          (resume)="onResume(toast.id)"
          (action)="onAction(toast.id)"
        />
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      padding: 16px;
      max-width: 100%;
      box-sizing: border-box;
    }
    .toast-stack > * { pointer-events: auto; }

    .top-right    { top: 0;    right: 0;    align-items: flex-end; }
    .top-left     { top: 0;    left: 0;     align-items: flex-start; }
    .bottom-right { bottom: 0; right: 0;    align-items: flex-end; }
    .bottom-left  { bottom: 0; left: 0;     align-items: flex-start; }
    .top-center, .bottom-center {
      left: 50%; transform: translateX(-50%);
      align-items: center;
    }
    .top-center    { top: 0; }
    .bottom-center { bottom: 0; }

    @media (max-width: 600px) {
      .toast-stack {
        left: 0; right: 0; bottom: 0; top: auto;
        transform: none;
        padding: 12px;
        align-items: stretch;
      }
    }
  `],
})
export class ToastContainerComponent {
  position!: ToastPosition;
  toasts!: Signal<ToastInternal[]>;
  onClose!: (id: string) => void;
  onPause!: (id: string) => void;
  onResume!: (id: string) => void;
  onAction!: (id: string) => void;

  positionClass = () => this.position;
}