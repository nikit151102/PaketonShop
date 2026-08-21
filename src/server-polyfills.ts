/**
 * Полифиллы браузерных API для серверного окружения (SSR).
 * Позволяет коду, написанному под браузер, не падать на сервере.
 */

const isServer = typeof window === 'undefined';

if (isServer) {
  const globalAny = globalThis as any;

  // Мок для window
  if (!globalAny.window) {
    globalAny.window = {
      location: { href: '', origin: '', pathname: '/', search: '', hash: '' },
      navigator: { userAgent: 'node', language: 'ru' },
      document: {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => true,
      innerWidth: 1920,
      innerHeight: 1080,
      matchMedia: () => ({ matches: false, addListener: () => {}, removeListener: () => {} }),
      localStorage: {},
      sessionStorage: {},
      open: () => null,
      close: () => {},
      print: () => {},
      history: { pushState: () => {}, replaceState: () => {}, go: () => {}, back: () => {}, forward: () => {} },
      getComputedStyle: () => ({ getPropertyValue: () => '' }),
      requestAnimationFrame: (cb: Function) => setTimeout(cb, 16),
      cancelAnimationFrame: (id: number) => clearTimeout(id),
    };
  }

  // Мок для document
  if (!globalAny.document) {
    const noopElement = {
      appendChild: () => noopElement,
      removeChild: () => noopElement,
      remove: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      setAttribute: () => {},
      getAttribute: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      style: {},
      classList: { add: () => {}, remove: () => {}, toggle: () => {} },
      innerHTML: '',
      textContent: '',
      clientWidth: 1920,
      clientHeight: 1080,
    };

    globalAny.document = {
      createElement: () => noopElement,
      createElementNS: () => noopElement,
      createTextNode: () => noopElement,
      body: noopElement,
      head: noopElement,
      documentElement: noopElement,
      querySelector: () => null,
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      cookie: '',
      title: '',
    };
  }

  // Мок для localStorage
  if (!globalAny.localStorage) {
    const store: Record<string, string> = {};
    globalAny.localStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const key in store) delete store[key]; },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; },
    };
  }

  // Мок для sessionStorage
  if (!globalAny.sessionStorage) {
    const store: Record<string, string> = {};
    globalAny.sessionStorage = {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const key in store) delete store[key]; },
      key: (i: number) => Object.keys(store)[i] ?? null,
      get length() { return Object.keys(store).length; },
    };
  }

  // Мок для navigator
  if (!globalAny.navigator) {
    globalAny.navigator = {
      userAgent: 'node-ssr',
      language: 'ru',
      languages: ['ru'],
      platform: 'node',
      onLine: true,
      geolocation: {
        getCurrentPosition: (success: Function) => { /* ничего не делаем */ },
        watchPosition: () => 0,
        clearWatch: () => {},
      },
      share: undefined,
      clipboard: { writeText: () => Promise.resolve() },
    };
  }

  // Мок для requestAnimationFrame / cancelAnimationFrame
  if (!globalAny.requestAnimationFrame) {
    globalAny.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 16);
  }
  if (!globalAny.cancelAnimationFrame) {
    globalAny.cancelAnimationFrame = (id: number) => clearTimeout(id);
  }

  // Мок для IntersectionObserver
  if (!globalAny.IntersectionObserver) {
    globalAny.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // Мок для ResizeObserver
  if (!globalAny.ResizeObserver) {
    globalAny.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }

  // Мок для matchMedia
  if (!globalAny.matchMedia) {
    globalAny.matchMedia = () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }

  // Мок для btoa/atob
  if (!globalAny.btoa) {
    globalAny.btoa = (str: string) => Buffer.from(str, 'binary').toString('base64');
  }
  if (!globalAny.atob) {
    globalAny.atob = (str: string) => Buffer.from(str, 'base64').toString('binary');
  }

  // Мок для Image (нужен для некоторых библиотек)
  if (!globalAny.Image) {
    globalAny.Image = class {
      onload: (() => void) | null = null;
      src = '';
      constructor() {
        setTimeout(() => this.onload?.(), 0);
      }
    };
  }
}