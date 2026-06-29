import { ApplicationRef, ComponentRef, createComponent, EnvironmentInjector, inject, Injectable, Injector, signal, WritableSignal } from '@angular/core';
import { ToastConfig, ToastInternal, ToastPosition, ToastRef, ToastType } from './toast.model';
import { DEFAULT_TOAST_CONFIG, ToastGlobalConfig, TOAST_CONFIG } from './toast.config';
import { ToastContainerComponent } from './toast-container.component';

@Injectable({ providedIn: 'root' })
export class ToastService {
    private readonly appRef = inject(ApplicationRef);
    private readonly injector = inject(Injector);
    private readonly envInjector = inject(EnvironmentInjector);
    private readonly globalConfig: ToastGlobalConfig =
        inject(TOAST_CONFIG, { optional: true }) ?? DEFAULT_TOAST_CONFIG;

    // Signal-карта: позиция -> список тостов
    private readonly containers = new Map<ToastPosition, {
        ref: ComponentRef<ToastContainerComponent>;
        toasts: WritableSignal<ToastInternal[]>;
    }>();

    private counter = 0;

    success(message: string, title?: string, cfg?: Partial<ToastConfig>): ToastRef {
        return this.show({ ...cfg, message, title, type: 'success' });
    }

    error(message: string, title?: string, cfg?: Partial<ToastConfig>): ToastRef {
        return this.show({ ...cfg, message, title, type: 'error' });
    }

    warning(message: string, title?: string, cfg?: Partial<ToastConfig>): ToastRef {
        return this.show({ ...cfg, message, title, type: 'warning' });
    }

    info(message: string, title?: string, cfg?: Partial<ToastConfig>): ToastRef {
        return this.show({ ...cfg, message, title, type: 'info' });
    }

    loading(message: string, title?: string, cfg?: Partial<ToastConfig>): ToastRef {
        return this.show({ ...cfg, message, title, type: 'loading', duration: 0 });
    }

    show(cfg: ToastConfig): ToastRef {
        const position = cfg.position ?? this.globalConfig.position;
        const id = cfg.id ?? `toast-${++this.counter}-${Date.now()}`;

        const cleanMessage = this.cleanText(cfg.message);
        const cleanTitle = cfg.title ? this.cleanText(cfg.title) : '';

        const toast: ToastInternal = {
            id,
            title: cleanTitle,
            message: cleanMessage,
            type: cfg.type ?? 'info',
            duration: cfg.duration ?? this.globalConfig.duration,
            position,
            dismissible: cfg.dismissible ?? this.globalConfig.dismissible,
            showProgress: cfg.showProgress ?? this.globalConfig.showProgress,
            pauseOnHover: cfg.pauseOnHover ?? this.globalConfig.pauseOnHover,
            createdAt: Date.now(),
            action: cfg.action,
            state: 'enter',
            paused: false,
            remaining: cfg.duration ?? this.globalConfig.duration,
        };

        const container = this.getOrCreateContainer(position);
        container.toasts.update(list => {
            const next = [...list, toast];
            return next.slice(-this.globalConfig.maxItems);
        });

        // Переводим в visible после анимации входа
        setTimeout(() => {
            container.toasts.update(list =>
                list.map(t => (t.id === id ? { ...t, state: 'visible' } : t))
            );
        }, 20);

        let actionResolve: () => void = () => { };
        const onAction = new Promise<void>(r => (actionResolve = r));

        return {
            id,
            close: () => this.close(id, position),
            onAction,
        };
    }

    close(id: string, position?: ToastPosition) {
        const targets = position ? [position] : (Array.from(this.containers.keys()) as ToastPosition[]);
        for (const pos of targets) {
            const c = this.containers.get(pos);
            if (!c) continue;
            c.toasts.update(list => list.map(t => (t.id === id ? { ...t, state: 'exit' } : t)));
            setTimeout(() => {
                c.toasts.update(list => list.filter(t => t.id !== id));
            }, 260);
        }
    }

    clear(position?: ToastPosition) {
        const targets = position ? [position] : (Array.from(this.containers.keys()) as ToastPosition[]);
        for (const pos of targets) {
            const c = this.containers.get(pos);
            if (!c) continue;
            c.toasts.update(list => list.map(t => ({ ...t, state: 'exit' as const })));
            setTimeout(() => c.toasts.set([]), 260);
        }
    }

    private getOrCreateContainer(position: ToastPosition) {
        let c = this.containers.get(position);
        if (c) return c;

        const toasts = signal<ToastInternal[]>([]);
        const ref = createComponent(ToastContainerComponent, {
            environmentInjector: this.envInjector,
            elementInjector: this.injector,
        });
        ref.instance.position = position;
        ref.instance.toasts = toasts;
        ref.instance.onClose = (id: string) => this.close(id, position);
        ref.instance.onPause = (id: string) => {
            c!.toasts.update(l => l.map(t => (t.id === id ? { ...t, paused: true } : t)));
        };
        ref.instance.onResume = (id: string) => {
            c!.toasts.update(l => l.map(t => (t.id === id ? { ...t, paused: false } : t)));
        };
        ref.instance.onAction = (id: string) => {
            const t = c!.toasts().find(x => x.id === id);
            t?.action?.onClick();
            this.close(id, position);
        };

        document.body.appendChild(ref.location.nativeElement);
        this.appRef.attachView(ref.hostView);

        c = { ref, toasts };
        this.containers.set(position, c);
        return c;
    }

    private cleanText(text: string | undefined | null): string {
        if (!text) return '';
        return text
            .replace(/\s*\[[^\]]*\]/g, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
    }
}