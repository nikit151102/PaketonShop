import { Component, HostListener, OnDestroy, OnInit, Renderer2, Inject, PLATFORM_ID, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './core/components/header/header.component';
import { FooterComponent } from './core/components/footer/footer.component';
import { AuthComponent } from './modules/auth/auth.component';
import { LocationComponent } from './core/components/location/location.component';
import { MobileBottomNavComponent } from './core/components/mobile-bottom-nav/mobile-bottom-nav.component';
import { CommonModule } from '@angular/common';
import { BasketsService } from './core/api/baskets.service';
import { StorageUtils } from '../utils/storage.utils';
import { memoryCacheEnvironment } from '../environment';
import { filter, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { CustomContextMenuComponent, MenuItem } from './core/components/custom-context-menu/custom-context-menu.component';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    RouterOutlet,
    HeaderComponent,
    MobileBottomNavComponent,
    FooterComponent,
    AuthComponent,
    LocationComponent,
    CustomContextMenuComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild('contextMenu') contextMenu!: CustomContextMenuComponent;

  title = 'PaketonShop';
  isMobile: boolean = false;
  isBrowser: boolean = false;

  private previousUrl: string = '';
  private isFlipbookPageChange: boolean = false;
  private routerSubscription: Subscription | null = null;
  private imageObserver: IntersectionObserver | null = null;
  private protectedImages: Set<HTMLImageElement> = new Set();
  private currentContextImage: HTMLImageElement | null = null;
  private currentSelectedText: string = '';

  // Конфигурация пунктов меню
  private imageMenuItems: MenuItem[] = [
    // { label: 'Открыть изображение', action: 'open_image' },
    // { label: 'Копировать URL изображения', action: 'copy_image_url' },
    // { label: 'Информация об изображении', action: 'image_info' },
  ];

  private protectedImageMenuItems: MenuItem[] = [
    { label: 'Просмотр', action: 'open_image' },
    { label: 'Информация', action: 'image_info' },
  ];

  private pageMenuItems: MenuItem[] = [
    { label: 'Обновить страницу', action: 'refresh_page' },
    { label: 'Копировать ссылку', action: 'copy_page_link' },
    { label: 'Назад', action: 'go_back' },
    { label: 'Вперед', action: 'go_forward' },
  ];

  private productMenuItems: MenuItem[] = [
    { label: 'Добавить в избранное', action: 'add_to_favorites' },
    { label: 'Сравнить', action: 'compare_product' },
    { label: 'Поделиться', action: 'share_product' },
    { label: 'Пожаловаться', action: 'report_product' },
  ];

  private linkMenuItems: MenuItem[] = [
    { label: 'Открыть в новой вкладке', action: 'open_link_new_tab' },
    { label: 'Копировать ссылку', action: 'copy_link_url' },
  ];

  // Новые пункты меню для текста
  private textMenuItems: MenuItem[] = [
    { label: 'Копировать текст', action: 'copy_text' },
    { label: 'Выделить всё', action: 'select_all_text' },
    { label: 'Поискать в Google', action: 'search_in_google' },
  ];

  private inputMenuItems: MenuItem[] = [
    { label: 'Копировать', action: 'copy_input_text' },
    { label: 'Вырезать', action: 'cut_input_text' },
    { label: 'Вставить', action: 'paste_input_text' },
    { label: 'Выделить всё', action: 'select_all_input' },
  ];

  constructor(
    private basketsService: BasketsService,
    private router: Router,
    private renderer: Renderer2,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  @HostListener('window:resize', ['$event'])
  onResize(): void {
    if (!this.isBrowser) return;
    this.isMobile = window.innerWidth <= 950;
  }

  @HostListener('document:contextmenu', ['$event'])
  onContextMenu(event: MouseEvent): void {
    if (!this.isBrowser) return;

    event.preventDefault();

    const target = event.target as HTMLElement;
    let menuItems: MenuItem[] = [];

    // Проверяем выделенный текст
    const selectedText = window.getSelection()?.toString().trim();
    
    // Проверяем, является ли элемент input или textarea
    const isInputElement = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          (target as HTMLInputElement).isContentEditable;
    
    // Проверяем изображение
    if (target.tagName === 'IMG') {
      this.currentContextImage = target as HTMLImageElement;
      if (this.protectedImages.has(target as HTMLImageElement)) {
        menuItems = this.protectedImageMenuItems;
      } else {
        menuItems = this.imageMenuItems;
      }
    }
    // Проверяем input/textarea
    else if (isInputElement) {
      menuItems = this.inputMenuItems;
    }
    // Проверяем ссылку
    else if (target.tagName === 'A' || target.closest('a')) {
      const link = target.tagName === 'A' ? target : target.closest('a');
      if (link) {
        menuItems = this.linkMenuItems;
      }
    }
    // Проверяем выделенный текст
    else if (selectedText && selectedText.length > 0) {
      this.currentSelectedText = selectedText;
      menuItems = this.textMenuItems;
    }
    // Проверяем карточку товара
    else if (target.closest('.product-card')) {
      menuItems = this.productMenuItems;
    }
    // Стандартное меню страницы
    else {
      menuItems = this.pageMenuItems;
    }

    if (menuItems.length > 0 && this.contextMenu) {
      this.contextMenu.show(event, menuItems);
    }
  }

  @HostListener('document:dragstart', ['$event'])
  onDragStart(event: DragEvent): boolean {
    if (!this.isBrowser) return true;

    const target = event.target as HTMLElement;

    if (target?.tagName === 'IMG') {
      event.preventDefault();
      this.showToastMessage('Перетаскивание изображений запрещено', 'warning');
      return false;
    }
    return true;
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (!this.isBrowser) return;

    // Блокировка Print Screen
    if (event.key === 'PrintScreen') {
      event.preventDefault();
      this.showToastMessage('Создание скриншотов запрещено', 'warning');
    }

    // Блокировка Ctrl+S
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      this.showToastMessage('Сохранение страницы запрещено', 'warning');
    }

    // Блокировка Ctrl+P
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      this.showToastMessage('Печать страницы запрещена', 'warning');
    }

    // Блокировка Ctrl+C на изображениях (текст разрешен)
    if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
      const selection = window.getSelection();
      const target = event.target as HTMLElement;
      
      // Блокируем копирование только если это изображение
      if (target?.tagName === 'IMG' || 
          (selection && selection.toString().includes('img'))) {
        event.preventDefault();
        this.showToastMessage('Копирование изображений запрещено', 'warning');
      }
      // Копирование текста разрешено
    }

    // Блокировка инструментов разработчика
    if (event.key === 'F12' ||
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'I') ||
      ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'C') ||
      ((event.ctrlKey || event.metaKey) && event.key === 'U')) {
      event.preventDefault();
      this.showToastMessage('Инструменты разработчика временно ограничены', 'info');
    }
  }

  @HostListener('document:copy', ['$event'])
  onCopy(event: ClipboardEvent): boolean {
    if (!this.isBrowser) return true;

    const selection = window.getSelection();
    const target = event.target as HTMLElement;

    // Разрешаем копирование текста, блокируем только изображения
    if (target?.tagName === 'IMG') {
      event.preventDefault();
      this.showToastMessage('Копирование изображений запрещено', 'warning');
      return false;
    }
    
    // Текст копируется свободно
    return true;
  }

  @HostListener('document:cut', ['$event'])
  onCut(event: ClipboardEvent): boolean {
    if (!this.isBrowser) return true;

    const target = event.target as HTMLElement;
    if (target?.tagName === 'IMG') {
      event.preventDefault();
      this.showToastMessage('Вырезание изображений запрещено', 'warning');
      return false;
    }
    return true;
  }

  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    this.cleanupImageProtection();
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    this.initMobileDetection();
    this.loadBaskets();
    this.initRouterEvents();
    this.initImageProtection();
    this.protectExistingImages();
    this.injectProtectionStyles();
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    this.cleanupImageProtection();
    if (this.imageObserver) {
      this.imageObserver.disconnect();
    }
  }

  /**
   * Обработка действий из контекстного меню
   */
  handleContextMenuAction(action: string): void {
    console.log('action', action);
    switch (action) {
      // Действия с изображениями
      case 'open_image':
        this.openImage();
        break;
      case 'copy_image_url':
        this.copyImageUrl();
        break;
      case 'image_info':
        this.showImageInfo();
        break;

      // Действия со страницей
      case 'refresh_page':
        window.location.reload();
        break;
      case 'copy_page_link':
        this.copyPageLink();
        break;
      case 'go_back':
        window.history.back();
        break;
      case 'go_forward':
        window.history.forward();
        break;

      // Действия с товарами
      case 'add_to_favorites':
        this.addToFavorites();
        break;
      case 'compare_product':
        this.compareProduct();
        break;
      case 'share_product':
        this.shareProduct();
        break;
      case 'report_product':
        this.reportProduct();
        break;

      // Действия со ссылками
      case 'open_link_new_tab':
        this.openLinkInNewTab();
        break;
      case 'copy_link_url':
        this.copyLinkUrl();
        break;

      // Действия с текстом
      case 'copy_text':
        this.copySelectedText();
        break;
      case 'select_all_text':
        this.selectAllText();
        break;
      case 'search_in_google':
        this.searchInGoogle();
        break;

      // Действия с input/textarea
      case 'copy_input_text':
        this.copyInputText();
        break;
      case 'cut_input_text':
        this.cutInputText();
        break;
      case 'paste_input_text':
        this.pasteInputText();
        break;
      case 'select_all_input':
        this.selectAllInput();
        break;

      default:
        console.warn('Unknown action:', action);
    }
  }

  // ============ НОВЫЕ МЕТОДЫ ДЛЯ РАБОТЫ С ТЕКСТОМ ============

  /**
   * Копировать выделенный текст
   */
  private copySelectedText(): void {
    if (this.currentSelectedText) {
      navigator.clipboard.writeText(this.currentSelectedText)
        .then(() => this.showToastMessage('Текст скопирован', 'info'))
        .catch(() => this.showToastMessage('Не удалось скопировать текст', 'error'));
    } else {
      // Пробуем получить выделение напрямую
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text) {
        navigator.clipboard.writeText(text)
          .then(() => this.showToastMessage('Текст скопирован', 'info'))
          .catch(() => this.showToastMessage('Не удалось скопировать текст', 'error'));
      } else {
        this.showToastMessage('Нет выделенного текста', 'warning');
      }
    }
  }

  /**
   * Выделить весь текст на странице
   */
  private selectAllText(): void {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(document.body);
      selection.removeAllRanges();
      selection.addRange(range);
      this.showToastMessage('Весь текст выделен', 'info');
    }
  }

  /**
   * Поиск выделенного текста в Google
   */
  private searchInGoogle(): void {
    let searchText = this.currentSelectedText;
    if (!searchText) {
      const selection = window.getSelection();
      searchText = selection?.toString().trim() || '';
    }
    
    if (searchText) {
      const encodedText = encodeURIComponent(searchText);
      window.open(`https://www.google.com/search?q=${encodedText}`, '_blank');
      this.showToastMessage('Поиск в Google', 'info');
    } else {
      this.showToastMessage('Нет текста для поиска', 'warning');
    }
  }

  /**
   * Копировать текст из input/textarea
   */
  private copyInputText(): void {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      const text = activeElement.value.substring(
        activeElement.selectionStart || 0,
        activeElement.selectionEnd || 0
      );
      
      if (text) {
        navigator.clipboard.writeText(text)
          .then(() => this.showToastMessage('Текст скопирован', 'info'))
          .catch(() => this.showToastMessage('Не удалось скопировать текст', 'error'));
      } else {
        // Если ничего не выделено, копируем всё значение
        navigator.clipboard.writeText(activeElement.value)
          .then(() => this.showToastMessage('Текст скопирован', 'info'))
          .catch(() => this.showToastMessage('Не удалось скопировать текст', 'error'));
      }
    } else {
      this.showToastMessage('Элемент ввода не активен', 'warning');
    }
  }

  /**
   * Вырезать текст из input/textarea
   */
  private cutInputText(): void {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      let textToCut = '';
      const start = activeElement.selectionStart || 0;
      const end = activeElement.selectionEnd || 0;
      
      if (start !== end) {
        textToCut = activeElement.value.substring(start, end);
        const newValue = activeElement.value.substring(0, start) + activeElement.value.substring(end);
        activeElement.value = newValue;
        
        navigator.clipboard.writeText(textToCut)
          .then(() => {
            this.showToastMessage('Текст вырезан', 'info');
            // Триггерим событие изменения
            activeElement.dispatchEvent(new Event('input'));
          })
          .catch(() => this.showToastMessage('Не удалось вырезать текст', 'error'));
      } else {
        this.showToastMessage('Выделите текст для вырезания', 'warning');
      }
    }
  }

  /**
   * Вставить текст в input/textarea
   */
  private async pasteInputText(): Promise<void> {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      try {
        const text = await navigator.clipboard.readText();
        const start = activeElement.selectionStart || 0;
        const end = activeElement.selectionEnd || 0;
        
        const newValue = activeElement.value.substring(0, start) + text + activeElement.value.substring(end);
        activeElement.value = newValue;
        
        // Устанавливаем новую позицию курсора
        const newCursorPos = start + text.length;
        activeElement.setSelectionRange(newCursorPos, newCursorPos);
        
        // Триггерим событие изменения
        activeElement.dispatchEvent(new Event('input'));
        this.showToastMessage('Текст вставлен', 'info');
      } catch (error) {
        this.showToastMessage('Не удалось вставить текст', 'error');
      }
    } else {
      this.showToastMessage('Элемент ввода не активен', 'warning');
    }
  }

  /**
   * Выделить всё в input/textarea
   */
  private selectAllInput(): void {
    const activeElement = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      activeElement.select();
      this.showToastMessage('Текст выделен', 'info');
    }
  }

  // ============ ОСТАЛЬНЫЕ МЕТОДЫ (без изменений) ============

  /**
   * Открыть изображение в новой вкладке
   */
  private openImage(): void {
    if (this.currentContextImage) {
      window.open(this.currentContextImage.src, '_blank');
    }
  }

  /**
   * Скопировать URL изображения
   */
  private copyImageUrl(): void {
    if (this.currentContextImage) {
      navigator.clipboard.writeText(this.currentContextImage.src)
        .then(() => this.showToastMessage('URL изображения скопирован', 'info'))
        .catch(() => this.showToastMessage('Не удалось скопировать URL', 'error'));
    }
  }

  /**
   * Показать информацию об изображении
   */
  private showImageInfo(): void {
    if (this.currentContextImage) {
      const img = this.currentContextImage;
      const info = `Размер: ${img.naturalWidth} x ${img.naturalHeight} пикселей\nФормат: ${this.getImageFormat(img.src)}\nВес: ${this.getImageSize(img)}`;
      alert(info);
      this.showToastMessage(`Изображение ${img.naturalWidth}x${img.naturalHeight}`, 'info');
    }
  }

  /**
   * Получить формат изображения
   */
  private getImageFormat(src: string): string {
    const extension = src.split('.').pop()?.toLowerCase() || 'unknown';
    const formats: { [key: string]: string } = {
      'jpg': 'JPEG',
      'jpeg': 'JPEG',
      'png': 'PNG',
      'webp': 'WebP',
      'svg': 'SVG',
      'gif': 'GIF'
    };
    return formats[extension] || extension.toUpperCase();
  }

  /**
   * Получить размер изображения (приблизительный)
   */
  private getImageSize(img: HTMLImageElement): string {
    return '~' + Math.round((img.naturalWidth * img.naturalHeight * 3) / 1024) + ' KB';
  }

  /**
   * Скопировать ссылку на страницу
   */
  private copyPageLink(): void {
    navigator.clipboard.writeText(window.location.href)
      .then(() => this.showToastMessage('Ссылка скопирована', 'info'))
      .catch(() => this.showToastMessage('Не удалось скопировать ссылку', 'error'));
  }

  /**
   * Добавить в избранное
   */
  private addToFavorites(): void {
    this.showToastMessage('Добавлено в избранное', 'info');
  }

  /**
   * Сравнить товар
   */
  private compareProduct(): void {
    this.showToastMessage('Добавлено в сравнение', 'info');
  }

  /**
   * Поделиться товаром
   */
  private shareProduct(): void {
    if (navigator.share) {
      navigator.share({
        title: document.title,
        url: window.location.href,
      }).catch(() => {});
    } else {
      this.copyPageLink();
    }
  }

  /**
   * Пожаловаться на товар
   */
  private reportProduct(): void {
    this.showToastMessage('Жалоба отправлена администрации', 'info');
  }

  /**
   * Открыть ссылку в новой вкладке
   */
  private openLinkInNewTab(): void {
    const selection = window.getSelection();
    let link: HTMLAnchorElement | null = null;

    if (selection && selection.anchorNode) {
      link = (selection.anchorNode as HTMLElement).closest?.('a') || null;
    }

    if (!link) {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'A') {
        link = activeElement as HTMLAnchorElement;
      }
    }

    if (link && link.href) {
      window.open(link.href, '_blank');
    }
  }

  /**
   * Скопировать URL ссылки
   */
  private copyLinkUrl(): void {
    const selection = window.getSelection();
    let link: HTMLAnchorElement | null = null;

    if (selection && selection.anchorNode) {
      link = (selection.anchorNode as HTMLElement).closest?.('a') || null;
    }

    if (!link) {
      const activeElement = document.activeElement;
      if (activeElement && activeElement.tagName === 'A') {
        link = activeElement as HTMLAnchorElement;
      }
    }

    if (link && link.href) {
      navigator.clipboard.writeText(link.href)
        .then(() => this.showToastMessage('Ссылка скопирована', 'info'))
        .catch(() => this.showToastMessage('Не удалось скопировать ссылку', 'error'));
    }
  }

  /**
   * Инициализация определения мобильного устройства
   */
  private initMobileDetection(): void {
    this.isMobile = window.innerWidth <= 950;
  }

  /**
   * Инициализация обработки событий роутера
   */
  private initRouterEvents(): void {
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.handleNavigationEnd(event);
        this.protectNewImages();
      });
  }

  /**
   * Обработка завершения навигации
   */
  private handleNavigationEnd(event: NavigationEnd): void {
    const currentUrl = event.urlAfterRedirects;
    const isFlipbookWithPage = this.isFlipbookUrlWithPage(currentUrl);
    const isOnlyPageParamChanged = this.isOnlyPageParamChanged(this.previousUrl, currentUrl);

    if (isFlipbookWithPage && isOnlyPageParamChanged) {
      this.isFlipbookPageChange = true;
    } else {
      this.isFlipbookPageChange = false;
      this.scrollToTop();
    }

    this.previousUrl = currentUrl;
  }

  /**
   * Плавная прокрутка наверх
   */
  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Проверяет, является ли URL страницей флипбука с параметром page
   */
  private isFlipbookUrlWithPage(url: string): boolean {
    try {
      const urlObj = new URL(url, window.location.origin);
      return urlObj.searchParams.get('viewMode') === 'flipbook' &&
        urlObj.searchParams.has('page');
    } catch {
      return url.includes('viewMode=flipbook') && url.includes('page=');
    }
  }

  /**
   * Проверяет, изменился ли только параметр page при одинаковом пути
   */
  private isOnlyPageParamChanged(previousUrl: string, currentUrl: string): boolean {
    if (!previousUrl) return false;

    try {
      const prevUrlObj = new URL(previousUrl, window.location.origin);
      const currUrlObj = new URL(currentUrl, window.location.origin);

      if (prevUrlObj.pathname !== currUrlObj.pathname) {
        return false;
      }

      const prevParams = new URLSearchParams(prevUrlObj.search);
      const currParams = new URLSearchParams(currUrlObj.search);

      return this.compareParamsWithPageOnly(prevParams, currParams);
    } catch {
      return this.compareParamsFallback(previousUrl, currentUrl);
    }
  }

  /**
   * Сравнение параметров URL с учетом только page
   */
  private compareParamsWithPageOnly(prevParams: URLSearchParams, currParams: URLSearchParams): boolean {
    let pageChanged = false;
    let otherParamsMatch = true;

    for (const [key, value] of prevParams.entries()) {
      if (key === 'page') {
        if (currParams.get(key) !== value) {
          pageChanged = true;
        }
      } else {
        if (currParams.get(key) !== value) {
          otherParamsMatch = false;
          break;
        }
      }
    }

    if (otherParamsMatch) {
      for (const [key] of currParams.entries()) {
        if (key !== 'page' && !prevParams.has(key)) {
          otherParamsMatch = false;
          break;
        }
      }
    }

    return otherParamsMatch && pageChanged;
  }

  /**
   * Fallback метод для сравнения параметров при ошибках
   */
  private compareParamsFallback(previousUrl: string, currentUrl: string): boolean {
    if (!previousUrl || !currentUrl) return false;

    const prevParts = previousUrl.split('?');
    const currParts = currentUrl.split('?');

    if (prevParts[0] !== currParts[0]) return false;

    if (prevParts.length === 1 || currParts.length === 1) return false;

    const prevParams = new URLSearchParams(prevParts[1] || '');
    const currParams = new URLSearchParams(currParts[1] || '');

    return this.compareParamsWithPageOnly(prevParams, currParams);
  }

  /**
   * Загрузить корзины пользователя
   */
  loadBaskets(): void {
    this.basketsService
      .filterBaskets({
        filters: [],
        sorts: [],
        page: 0,
        pageSize: 10,
      })
      .pipe(take(1))
      .subscribe({
        next: (res) => {
          StorageUtils.setMemoryCache(
            memoryCacheEnvironment.baskets.key,
            res.data,
            memoryCacheEnvironment.baskets.ttl,
          );
        },
        error: (err) => console.error('Ошибка загрузки корзин', err),
      });
  }

  /**
   * Инициализация защиты изображений с помощью Intersection Observer
   */
  private initImageProtection(): void {
    if (!this.isBrowser) return;

    this.imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.protectSingleImage(img);
        }
      });
    }, { threshold: 0.1 });
  }

  /**
   * Защита существующих изображений на странице
   */
  private protectExistingImages(): void {
    if (!this.isBrowser) return;

    const images = document.querySelectorAll('img');
    images.forEach(img => this.protectSingleImage(img));
  }

  /**
   * Защита новых изображений (после динамической загрузки)
   */
  private protectNewImages(): void {
    if (!this.isBrowser) return;

    setTimeout(() => {
      const images = document.querySelectorAll('img');
      images.forEach(img => {
        if (!this.protectedImages.has(img)) {
          this.protectSingleImage(img);
        }
      });
    }, 100);
  }

  /**
   * Защита одного изображения
   */
  private protectSingleImage(img: HTMLImageElement): void {
    if (this.protectedImages.has(img)) return;

    this.renderer.addClass(img, 'protected-image');
    this.renderer.setAttribute(img, 'draggable', 'false');
    this.renderer.setAttribute(img, 'crossorigin', 'anonymous');

    this.wrapImageWithProtection(img);

    this.protectedImages.add(img);

    if (this.imageObserver) {
      this.imageObserver.observe(img);
    }
  }

  /**
   * Обертка изображения в защитный контейнер
   */
  private wrapImageWithProtection(img: HTMLImageElement): void {
    if (img.parentElement && img.parentElement.classList.contains('image-protector')) {
      return;
    }

    try {
      const protector = this.renderer.createElement('div');
      this.renderer.addClass(protector, 'image-protector');
      this.renderer.setStyle(protector, 'position', 'relative');
      this.renderer.setStyle(protector, 'display', 'inline-block');

      const parent = img.parentNode;
      if (parent) {
        this.renderer.insertBefore(parent, protector, img);
        this.renderer.removeChild(parent, img);
        this.renderer.appendChild(protector, img);
      }
    } catch (error) {
      console.warn('Не удалось обернуть изображение:', error);
    }
  }

  /**
   * Внедрение CSS стилей для защиты
   */
  private injectProtectionStyles(): void {
    if (!this.isBrowser) return;

    const style = this.renderer.createElement('style');
    style.textContent = `
      .protected-image {
        pointer-events: auto;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        -webkit-tap-highlight-color: transparent;
      }
      
      .protected-image:active {
        pointer-events: none;
      }
      
      .image-protector {
        position: relative;
        display: inline-block;
        overflow: hidden;
      }
      
      .image-protector::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 1;
        pointer-events: none;
      }
      
      img {
        -webkit-user-drag: none;
        user-drag: none;
        -khtml-user-drag: none;
        -moz-user-drag: none;
        -o-user-drag: none;
      }
    `;
    this.renderer.appendChild(document.head, style);
  }

  /**
   * Показ всплывающего уведомления
   */
  private showToastMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const existingToast = document.querySelector('.image-protection-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = this.renderer.createElement('div');
    this.renderer.addClass(toast, 'image-protection-toast');
    this.renderer.addClass(toast, `toast-${type}`);
    this.renderer.setStyle(toast, 'position', 'fixed');
    this.renderer.setStyle(toast, 'bottom', '20px');
    this.renderer.setStyle(toast, 'right', '20px');
    this.renderer.setStyle(toast, 'background', type === 'warning' ? '#ff9800' : type === 'error' ? '#f44336' : '#2196f3');
    this.renderer.setStyle(toast, 'color', 'white');
    this.renderer.setStyle(toast, 'padding', '12px 20px');
    this.renderer.setStyle(toast, 'border-radius', '8px');
    this.renderer.setStyle(toast, 'z-index', '9999');
    this.renderer.setStyle(toast, 'font-size', '14px');
    this.renderer.setStyle(toast, 'font-family', 'sans-serif');
    this.renderer.setStyle(toast, 'box-shadow', '0 2px 10px rgba(0,0,0,0.2)');
    this.renderer.setStyle(toast, 'animation', 'fadeInOut 2s ease-in-out');
    this.renderer.setProperty(toast, 'textContent', message);

    const animationStyle = this.renderer.createElement('style');
    animationStyle.textContent = `
      @keyframes fadeInOut {
        0% { opacity: 0; transform: translateY(20px); }
        15% { opacity: 1; transform: translateY(0); }
        85% { opacity: 1; transform: translateY(0); }
        100% { opacity: 0; transform: translateY(20px); }
      }
    `;
    this.renderer.appendChild(document.head, animationStyle);

    this.renderer.appendChild(document.body, toast);

    setTimeout(() => {
      if (toast && toast.parentNode) {
        this.renderer.removeChild(document.body, toast);
      }
    }, 2000);
  }

  /**
   * Очистка защиты изображений
   */
  private cleanupImageProtection(): void {
    this.protectedImages.clear();
    if (this.imageObserver) {
      this.imageObserver.disconnect();
    }
  }
}