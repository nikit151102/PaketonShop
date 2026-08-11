import { NgClass } from '@angular/common';
import { Component, effect, ElementRef, inject, input, output } from '@angular/core';
import { ToastInternal, ToastType } from './toast.model';

@Component({
  selector: 'app-toast',
  imports: [NgClass],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.scss'
})
export class ToastComponent {
  toast = input.required<ToastInternal>();
  close = output<void>();
  pause = output<void>();
  resume = output<void>();
  action = output<void>();

  private readonly el = inject(ElementRef<HTMLElement>);
  private progressValue = 100;
  private startTime = 0;
  private rafId = 0;
  private pointerStart: { x: number; y: number } | null = null;
  private dragAxis: 'x' | 'y' | null = null;
  private dragOffset = 0;

  progress = () => this.progressValue;

  icon = () => ICONS[this.toast().type];

  constructor() {
    effect(() => {
      const t = this.toast();
      if (t.type === 'loading' || t.duration <= 0) return;
      this.startTimer();
    });

    effect(() => {
      const t = this.toast();
      if (t.paused) this.pauseTimer();
      else if (t.duration > 0 && t.type !== 'loading') this.resumeTimer();
    });
  }

  private startTimer() {
    this.startTime = Date.now();
    const duration = this.toast().remaining;
    const tick = () => {
      const elapsed = Date.now() - this.startTime;
      this.progressValue = Math.max(0, 100 - (elapsed / duration) * 100);
      if (this.progressValue <= 0) {
        this.close.emit();
        return;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(tick);
  }

  private pauseTimer() {
    cancelAnimationFrame(this.rafId);
  }

  private resumeTimer() {
    this.startTimer();
  }

  onEnter() {
    if (this.toast().pauseOnHover) this.pause.emit();
  }
  onLeave() {
    if (this.toast().pauseOnHover) this.resume.emit();
  }

  // --- Drag to dismiss ---
  onPointerDown(e: PointerEvent) {
    this.pointerStart = { x: e.clientX, y: e.clientY };
    this.dragAxis = null;
    this.dragOffset = 0;
    (e.target as Element).setPointerCapture?.(e.pointerId);
  }

  onPointerMove(e: PointerEvent) {
    if (!this.pointerStart) return;
    const dx = e.clientX - this.pointerStart.x;
    const dy = e.clientY - this.pointerStart.y;
    if (!this.dragAxis) {
      this.dragAxis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (this.dragAxis === 'x') {
      this.dragOffset = dx;
      const el = this.el.nativeElement.querySelector('.toast') as HTMLElement;
      if (el) el.style.transform = `translateX(${dx}px) rotate(${dx * 0.05}deg)`;
      if (el) el.style.opacity = String(Math.max(0.3, 1 - Math.abs(dx) / 200));
    }
  }

  onPointerUp() {
    if (this.dragAxis === 'x' && Math.abs(this.dragOffset) > 80) {
      this.close.emit();
    } else {
      const el = this.el.nativeElement.querySelector('.toast') as HTMLElement;
      if (el) {
        el.style.transform = '';
        el.style.opacity = '';
      }
    }
    this.pointerStart = null;
    this.dragAxis = null;
    this.dragOffset = 0;
  }

  onActionClick(e: Event) {
    e.stopPropagation();
    this.action.emit();
  }
}

const ICONS: Record<ToastType, string> = {
  success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 7"/></svg>`,
  error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>`,
  warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>`,
  info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>`,
}
