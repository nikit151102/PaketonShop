import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { UserService } from '../../../../core/services/user.service';
import { AddressesService } from '../../../../core/api/addresses.service';
import { BasketsService } from '../../../../core/api/baskets.service';
import { DeliveryOrderService } from '../../../../core/api/delivery-order.service';
import { PartnerService } from '../../../../core/api/partner.service';
import { ProductFavoriteService } from '../../../../core/api/product-favorite.service';
import { UserApiService } from '../../../../core/api/user.service';


Chart.register(...registerables);

// Интерфейсы для данных с бекенда
interface User {
  id: string;
  userNumber: string;
  userNumberInt: number;
  avatarUrl: string;
  firstName: string;
  lastName: string;
  middleName: string;
  birthday: string;
  phoneNumber: string;
  email: string;
  status: string;
  isMailSubscribed: boolean;
  registrationDate: string;
  lastLoginDate: string;
  isBanned: boolean;
  banDate: string;
  banReason: string;
  isFeedBackBanned: boolean;
  feedBackBanDate: string;
  feedBackBanReason: string;
  ordersCount: number;
  loyaltyProgramLevel: number;
  userRoles: any[];
  userCompanys: any[];
}

interface Address {
  id: string;
  region: string | null;
  area: string | null;
  city: string;
  street: string;
  house: string | null;
  housing: string | null;
  floorNumber: string | null;
  office: string | null;
  postIndex: string | null;
  latitude: number | null;
  longitude: number | null;
  system: string;
  transportCompanyType: number | null;
}

interface FavoriteProduct {
  id: string;
  idFrom1C: string;
  nameFrom1C: string;
  article: string;
  shortName: string;
  fullName: string;
  manufacturer: string;
  description: string;
  viewPriceSale: number | null;
  viewPrice: number | null;
  retailPrice: number;
  retailPriceDest: number;
  wholesalePrice: number;
  wholesalePriceDest: number;
  packCount: number;
  h1Title: string;
  keywords: string;
  grossWeight: number;
  height: number;
  width: number;
  depth: number;
  mainProductCategoryId: string | null;
  productImageLinks: string[];
  isFavorite: boolean;
  isComparing: boolean;
  countInActiveBasket: number | null;
  measurementUnit: any | null;
  saleType: any | null;
  userBaskets: any[];
  remains: any[];
  productProperties: any[];
  imageInstances: any[];
  productCategories: any[];
  productKeyNames: any[];
  priceChangeHistory: any[];
  promoOrders: any[];
}

interface Order {
  id: string;
  userInstance: {
    id: string;
    userNumber: string;
    userNumberInt: number;
    firstName: string;
    lastName: string;
    middleName: string;
    avatarUrl: string;
  };
  address: Address;
  deliveryType: {
    id: string;
    code: number;
    fullName: string;
    shortName: string;
  };
  partnerInstance: {
    id: string;
    partner: {
      id: string;
      shortName: string;
      fullName: string;
      inn: string;
      ogrn: string;
      email: string;
    };
  };
  promoCode: any;
  productPlace: any;
  consultation: boolean;
  orderDateTime: string;
  orderStatus: number;
  productCount: number;
  deliveryCost: number;
  orderCost: number;
  totalCost: number;
  productPositions: any[];
}

interface Partner {
  id: string;
  userInstances: any[];
  partner: {
    id: string;
    shortName: string;
    fullName: string;
    inn: string;
    ogrn: string;
    kpp: string;
    lastName: string;
    firstName: string;
    middleName: string;
    korAccount: string;
    workDirection: string;
    phoneNumber: string;
    email: string;
    address: any;
    partnerType: any;
  };
  bank: any;
}

interface Basket {
  id: string;
  name: string;
  userInstanceId: string;
  products: any[];
  productCount: number;
  isActiveBasket: boolean;
}

// Интерфейсы для дашборда
interface ActiveOrderDashboard {
  id: string;
  date: string;
  amount: number;
  status: 'processing' | 'shipping' | 'delivered';
  statusText: string;
}

interface Recommendation {
  id: number;
  name: string;
  image: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  rating: number;
  reviews: number;
}

interface Notification {
  id: number;
  type: 'order' | 'promotion' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  action?: string;
}

interface Promotion {
  id: number;
  title: string;
  description: string;
  discount: number;
  expiryDate: string;
  color1?: string;
  color2?: string;
}

interface DeliveryService {
  id: number;
  name: string;
  logo: string;
  active: boolean;
}

interface PersonalAddress {
  id: string;
  type: string;
  address: string;
  isDefault: boolean;
}

interface Company {
  id: string;
  name: string;
  inn: string;
  type: string;
  contracts: number;
  active: boolean;
  orders: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('statsChart') statsChartRef!: ElementRef;
  @ViewChild('sliderContainer') sliderContainerRef!: ElementRef;
  
  private chartInstance: Chart | null = null;
  private intervalId: any;
  
  // Данные пользователя с бекенда
  user: User | null = null;
  userLoading = true;
  userError = false;
  
  // Тема
  isDarkTheme = false;
  showUserMenu = false;
  
  // Время и дата
  currentDate = new Date();
  currentTime = '';
  
  // Статистика профиля (считается из данных)
  profileCompletion = 0;
  completedOrders = 0;
  daysWithUs = 0;
  loyaltyLevel = 'Bronze';
  
  // Заказы с бекенда
  activeTab: 'processing' | 'shipping' | 'delivered' = 'processing';
  processingOrders = 0;
  shippingOrders = 0;
  deliveredOrders = 0;
  activeOrders: ActiveOrderDashboard[] = [];
  ordersLoading = true;
  
  // Статистика (считается из заказов)
  selectedPeriod = 'month';
  totalSpent = 0;
  spendingChange = 0;
  averageOrder = 0;
  ordersCount = 0;
  
  // Рекомендации (статические, можно добавить логику)
  recommendations: Recommendation[] = [
    {
      id: 1,
      name: 'Умная колонка Яндекс Станция',
      image: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=150&h=150&fit=crop',
      price: 12999,
      oldPrice: 14999,
      discount: 13,
      rating: 4.8,
      reviews: 234
    },
    {
      id: 2,
      name: 'Электросамокат Xiaomi Pro 2',
      image: 'https://images.unsplash.com/photo-1579443464291-30e5312d6910?w=150&h=150&fit=crop',
      price: 34999,
      oldPrice: 39999,
      discount: 12,
      rating: 4.7,
      reviews: 156
    },
    {
      id: 3,
      name: 'Кофемашина DeLonghi Dedica',
      image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=150&h=150&fit=crop',
      price: 24990,
      oldPrice: 28990,
      discount: 14,
      rating: 4.9,
      reviews: 89
    }
  ];
  
  // Уведомления
  unreadNotifications = 0;
  notifications: Notification[] = [];
  
  // Акции
  featuredPromotion = {
    title: 'Черная пятница',
    description: 'Скидки до 50% на всю электронику и бытовую технику',
    discount: 50,
    expiryDate: '2024-12-01',
    color1: '#327120',
    color2: '#4a9c2a'
  };
  
  activePromotions: Promotion[] = [
    {
      id: 1,
      title: 'Бесплатная доставка',
      description: 'При заказе от 3000₽ доставка бесплатно',
      discount: 0,
      expiryDate: '31.12.2024'
    },
    {
      id: 2,
      title: 'Новогодняя распродажа',
      description: 'Скидка 20% на подарки и украшения',
      discount: 20,
      expiryDate: '25.12.2024'
    }
  ];
  
  // Слайдер рекомендаций
  currentSlide = 0;
  sliderOffset = 0;
  sliderItemWidth = 280;
  itemsPerSlide = 2;
  maxSlides = 0;
  
  // Таймер акции
  promotionTime = '02:15:36';

  // Избранное с бекенда
  favoritesCount = 0;
  favoritesCategories = 0;
  favoritesUpdated = 'сегодня';
  favoriteItems: any[] = [];
  favoritesLoading = true;

  // Адреса доставки с бекенда
  deliveryServices: DeliveryService[] = [
    { id: 1, name: 'СДЭК', logo: 'СД', active: true },
    { id: 2, name: 'Байкал Сервис', logo: 'БС', active: true },
    { id: 3, name: 'Деловые Линии', logo: 'ДЛ', active: false },
    { id: 4, name: 'Почта России', logo: 'ПР', active: true }
  ];

  personalAddresses: PersonalAddress[] = [];
  addressesLoading = true;

  // Компании с бекенда
  companiesCount = 0;
  activeContracts = 0;
  totalOrdersFromCompanies = 0;
  companies: Company[] = [];
  companiesLoading = true;

  // Корзины с бекенда
  baskets: Basket[] = [];
  basketsLoading = true;

  constructor(
    private router: Router,
    private userService: UserService,
    private addressesService: AddressesService,
    private productFavoriteService: ProductFavoriteService,
    private deliveryOrderService: DeliveryOrderService,
    private partnerService: PartnerService,
    private basketsService: BasketsService,
    private userApiService: UserApiService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadUserData();
    this.initTime();
    this.startTimers();
    this.loadAllData();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initChart();
        this.calculateMaxSlides();
      }, 500);
    }
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }
  }

  // Загрузка всех данных с бекенда
  loadAllData(): void {
    this.loadAddresses();
    this.loadFavorites();
    this.loadOrders();
    this.loadPartners();
    this.loadBaskets();
  }

  // Загрузка данных пользователя
  loadUserData(): void {
    this.userApiService.getData().subscribe({
      next: (response: any) => {
        if (response.status === 200 && response.data) {
          this.user = response.data;
          this.calculateUserStats();
          this.userLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading user data:', error);
        this.userError = true;
        this.userLoading = false;
      }
    });
  }

  // Расчет статистики пользователя
  calculateUserStats(): void {
    if (!this.user) return;

    // Заполненность профиля
    const fields = [
      this.user.firstName,
      this.user.lastName,
      this.user.email,
      this.user.phoneNumber
    ];
    const filledFields = fields.filter(field => field && field.trim().length > 0).length;
    this.profileCompletion = Math.round((filledFields / fields.length) * 100);

    // Количество заказов
    this.completedOrders = this.user.ordersCount || 0;

    // Дней с нами
    if (this.user.registrationDate) {
      const regDate = new Date(this.user.registrationDate);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - regDate.getTime());
      this.daysWithUs = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Уровень лояльности
    if (this.user.loyaltyProgramLevel >= 10) {
      this.loyaltyLevel = 'Platinum';
    } else if (this.user.loyaltyProgramLevel >= 5) {
      this.loyaltyLevel = 'Gold';
    } else if (this.user.loyaltyProgramLevel >= 2) {
      this.loyaltyLevel = 'Silver';
    } else {
      this.loyaltyLevel = 'Bronze';
    }
  }

  // Загрузка адресов
  loadAddresses(): void {
    this.addressesService.getUserAddresses().subscribe({
      next: (response: any) => {
        if (response.status === 200 && response.data) {
          this.personalAddresses = this.transformAddresses(response.data);
          this.addressesLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading addresses:', error);
        this.addressesLoading = false;
      }
    });
  }

  // Трансформация адресов из API в формат дашборда
  transformAddresses(addresses: Address[]): PersonalAddress[] {
    return addresses.map((address, index) => {
      // Определяем тип адреса по системе доставки
      let addressType = 'Дом';
      if (address.system === 'sdek') addressType = 'СДЭК';
      else if (address.system === 'dellin') addressType = 'Деловые Линии';
      else if (address.system === 'web') {
        if (address.transportCompanyType === 3) addressType = 'Байкал Сервис';
        else addressType = index === 0 ? 'Дом' : 'Работа';
      }

      // Формируем полный адрес
      let fullAddress = '';
      if (address.city) fullAddress += address.city;
      if (address.street) fullAddress += `, ${address.street}`;
      if (address.house) fullAddress += `, д. ${address.house}`;
      if (address.housing) fullAddress += `, корп. ${address.housing}`;
      if (address.office) fullAddress += `, оф. ${address.office}`;

      return {
        id: address.id,
        type: addressType,
        address: fullAddress,
        isDefault: index === 0 // Первый адрес по умолчанию
      };
    });
  }

  // Загрузка избранного
  loadFavorites(): void {
    this.productFavoriteService.getFavorites([], null, 0, 5).subscribe({
      next: (response: any) => {
        if (response.status === 200 && response.data) {
          this.favoriteItems = this.transformFavorites(response.data);
          this.favoritesCount = response.data.length;
          this.favoritesCategories = this.countCategories(response.data);
          this.favoritesLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading favorites:', error);
        this.favoritesLoading = false;
      }
    });
  }

  // Трансформация избранного из API в формат дашборда
  transformFavorites(favorites: FavoriteProduct[]): any[] {
    return favorites.slice(0, 3).map(fav => ({
      id: fav.id,
      name: fav.nameFrom1C || fav.fullName,
      image: fav.productImageLinks && fav.productImageLinks.length > 0 
        ? fav.productImageLinks[0] 
        : 'https://via.placeholder.com/60x60?text=No+Image',
      price: fav.retailPrice || fav.wholesalePrice || 0,
      discount: fav.viewPriceSale && fav.viewPrice 
        ? Math.round((1 - fav.viewPriceSale / fav.viewPrice) * 100) 
        : undefined,
      inStock: this.checkProductAvailability(fav)
    }));
  }

  // Проверка наличия товара
  checkProductAvailability(product: FavoriteProduct): boolean {
    // Проверяем остатки
    if (product.remains && product.remains.length > 0) {
      return product.remains.some(remain => remain.count > 0);
    }
    return true; // По умолчанию в наличии
  }

  // Подсчет категорий в избранном
  countCategories(favorites: FavoriteProduct[]): number {
    if (!favorites || favorites.length === 0) return 0;
    
    const categories = new Set<string>();
    favorites.forEach(fav => {
      if (fav.productCategories && fav.productCategories.length > 0) {
        fav.productCategories.forEach(cat => {
          if (cat.name) categories.add(cat.name);
        });
      }
    });
    
    return categories.size;
  }

  // Загрузка заказов
  loadOrders(): void {
    this.deliveryOrderService.getOrders(0, 10).subscribe({
      next: (response: any) => {
        if (response.status === 200 && response.data) {
          this.processOrders(response.data);
          this.ordersLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading orders:', error);
        this.ordersLoading = false;
      }
    });
  }

  // Обработка заказов
  processOrders(orders: Order[]): void {
    this.activeOrders = orders.slice(0, 3).map(order => this.transformOrder(order));
    
    // Подсчет по статусам
    this.processingOrders = orders.filter(o => o.orderStatus === 0).length;
    this.shippingOrders = orders.filter(o => o.orderStatus === 1).length;
    this.deliveredOrders = orders.filter(o => o.orderStatus === 2).length;
    
    // Общая статистика
    this.ordersCount = orders.length;
    this.totalSpent = orders.reduce((sum, order) => sum + (order.totalCost || 0), 0);
    this.averageOrder = this.ordersCount > 0 ? Math.round(this.totalSpent / this.ordersCount) : 0;
  }

  // Трансформация заказа из API в формат дашборда
  transformOrder(order: Order): ActiveOrderDashboard {
    const orderDate = new Date(order.orderDateTime);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let dateText = '';
    if (diffDays === 0) dateText = 'Сегодня';
    else if (diffDays === 1) dateText = 'Вчера';
    else dateText = orderDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    
    const time = orderDate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    
    // Определяем статус
    let status: 'processing' | 'shipping' | 'delivered' = 'processing';
    let statusText = 'Обрабатывается';
    
    switch (order.orderStatus) {
      case 0:
        status = 'processing';
        statusText = 'Обрабатывается';
        break;
      case 1:
        status = 'shipping';
        statusText = 'В пути';
        break;
      case 2:
        status = 'delivered';
        statusText = 'Доставлен';
        break;
    }
    
    return {
      id: order.id.substring(0, 8).toUpperCase(),
      date: `${dateText}, ${time}`,
      amount: order.totalCost || 0,
      status: status,
      statusText: statusText
    };
  }

  // Загрузка партнеров (компаний)
  loadPartners(): void {
    this.partnerService.getPartnersUser().subscribe({
      next: (response: any) => {
        if (response.status === 200 && response.data) {
          this.companies = this.transformPartners(response.data);
          this.companiesCount = response.data.length;
          this.activeContracts = this.calculateActiveContracts(response.data);
          this.totalOrdersFromCompanies = this.calculateTotalOrders(response.data);
          this.companiesLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading partners:', error);
        this.companiesLoading = false;
      }
    });
  }

  // Трансформация партнеров из API в формат дашборда
  transformPartners(partners: Partner[]): Company[] {
    return partners.map(partner => ({
      id: partner.id,
      name: partner.partner.shortName || partner.partner.fullName,
      inn: partner.partner.inn,
      type: partner.partner.partnerType?.shortName || 'ООО',
      contracts: 1, // По умолчанию 1 договор на компанию
      active: true, // Предполагаем, что все активны
      orders: this.getCompanyOrderCount(partner.partner.inn)
    }));
  }

  // Подсчет активных договоров
  calculateActiveContracts(partners: Partner[]): number {
    return partners.length; // Каждый партнер имеет минимум 1 договор
  }

  // Подсчет общего количества заказов по компаниям
  calculateTotalOrders(partners: Partner[]): number {
    return partners.reduce((total, partner) => {
      return total + this.getCompanyOrderCount(partner.partner.inn);
    }, 0);
  }

  // Получение количества заказов по ИНН компании (заглушка)
  getCompanyOrderCount(inn: string): number {
    // В реальном приложении здесь будет запрос к API
    return Math.floor(Math.random() * 50) + 1; // Заглушка
  }

  // Загрузка корзин
  loadBaskets(): void {
    const filterDto = {
      filters: [],
      sorts: [],
      page: 0,
      pageSize: 10
    };

    this.basketsService.filterBaskets(filterDto).subscribe({
      next: (response: any) => {
        if (response.status === 200 && response.data) {
          this.baskets = response.data;
          this.basketsLoading = false;
        }
      },
      error: (error) => {
        console.error('Error loading baskets:', error);
        this.basketsLoading = false;
      }
    });
  }

  initTime(): void {
    const updateTime = () => {
      const now = new Date();
      this.currentTime = now.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    };
    
    updateTime();
    setInterval(updateTime, 60000);
  }

  startTimers(): void {
    this.intervalId = setInterval(() => {
      this.updatePromotionTimer();
    }, 1000);
  }

  updatePromotionTimer(): void {
    const [hours, minutes, seconds] = this.promotionTime.split(':').map(Number);
    let totalSeconds = hours * 3600 + minutes * 60 + seconds - 1;
    
    if (totalSeconds < 0) totalSeconds = 86400;
    
    const newHours = Math.floor(totalSeconds / 3600);
    const newMinutes = Math.floor((totalSeconds % 3600) / 60);
    const newSeconds = totalSeconds % 60;
    
    this.promotionTime = `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}:${newSeconds.toString().padStart(2, '0')}`;
  }

  initChart(): void {
    if (!this.statsChartRef || !isPlatformBrowser(this.platformId)) return;
    
    const ctx = this.statsChartRef.nativeElement.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 200);
    gradient.addColorStop(0, 'rgba(50, 113, 32, 0.3)');
    gradient.addColorStop(1, 'rgba(50, 113, 32, 0)');
    
    // Генерация данных на основе реальных заказов
    const monthlyData = this.generateMonthlyStats();
    
    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'],
        datasets: [{
          label: 'Потрачено',
          data: monthlyData,
          borderColor: '#327120',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#327120',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 12,
            cornerRadius: 8,
            displayColors: false,
            callbacks: {
              label: (context: any) => `${context.parsed.y.toLocaleString('ru-RU')} ₽`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#666' }
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' },
            ticks: {
              color: '#666',
              callback: (value: any) => `${value.toLocaleString('ru-RU')} ₽`
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    });
  }

  // Генерация месячной статистики на основе реальных данных
  generateMonthlyStats(): number[] {
    const base = this.totalSpent / 12;
    return Array.from({ length: 12 }, (_, i) => {
      const variation = Math.random() * 0.5 + 0.75; // Вариация 75-125%
      return Math.round(base * variation);
    });
  }

  calculateMaxSlides(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    
    setTimeout(() => {
      if (this.sliderContainerRef) {
        const containerWidth = this.sliderContainerRef.nativeElement.offsetWidth;
        this.itemsPerSlide = Math.floor(containerWidth / this.sliderItemWidth);
        this.maxSlides = Math.ceil(this.recommendations.length / this.itemsPerSlide) - 1;
      }
    }, 100);
  }

  slidePrev(): void {
    if (this.currentSlide > 0) {
      this.currentSlide--;
      this.sliderOffset = -this.currentSlide * this.itemsPerSlide * this.sliderItemWidth;
    }
  }

  slideNext(): void {
    if (this.currentSlide < this.maxSlides) {
      this.currentSlide++;
      this.sliderOffset = -this.currentSlide * this.itemsPerSlide * this.sliderItemWidth;
    }
  }

  getUserInitials(): string {
    if (!this.user) return '?';
    const first = this.user.firstName?.[0] || '';
    const last = this.user.lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  }

  // Методы взаимодействия
  toggleTheme(): void {
    this.isDarkTheme = !this.isDarkTheme;
    if (isPlatformBrowser(this.platformId)) {
      document.body.classList.toggle('dark-theme', this.isDarkTheme);
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  toggleNotifications(): void {
    console.log('Toggle notifications');
  }

  editProfile(): void {
    this.router.navigate(['/profile/edit']);
  }

  createOrder(): void {
    this.router.navigate(['/order/new']);
  }

  contactSupport(): void {
    this.router.navigate(['/support']);
  }

  viewAddresses(): void {
    this.router.navigate(['/addresses']);
  }

  viewFavorites(): void {
    this.router.navigate(['/favorites']);
  }

  downloadInvoices(): void {
    console.log('Download invoices');
  }

  viewCoupons(): void {
    this.router.navigate(['/coupons']);
  }

  refreshRecommendations(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.loadFavorites();
  }

  addToCart(item: Recommendation): void {
    console.log('Add to cart:', item);
  }

  markAllAsRead(): void {
    this.notifications.forEach(n => n.read = true);
    this.unreadNotifications = 0;
  }

  handleNotification(notification: Notification): void {
    if (notification.action) {
      this.router.navigate([notification.action]);
    }
    notification.read = true;
    this.unreadNotifications = this.notifications.filter(n => !n.read).length;
  }

  updateStats(): void {
    console.log('Update stats for period:', this.selectedPeriod);
    this.loadOrders(); // Перезагружаем заказы для обновления статистики
  }

  logout(): void {
    this.userService.clearUser();
    this.router.navigate(['/']);
  }

  // Новые методы для второго ряда
  removeFromFavorites(id: string): void {
    this.favoriteItems = this.favoriteItems.filter(item => item.id !== id);
    this.favoritesCount = this.favoriteItems.length;
    // Здесь можно добавить вызов API для удаления из избранного
  }

  browseFavorites(): void {
    this.router.navigate(['/favorites']);
  }

  toggleService(service: DeliveryService): void {
    service.active = !service.active;
    // Здесь можно добавить вызов API для обновления статуса службы доставки
  }

  addAddress(): void {
    this.router.navigate(['/addresses/new']);
  }

  editAddress(address: PersonalAddress): void {
    this.router.navigate(['/addresses', address.id, 'edit']);
  }

  addCompany(): void {
    this.router.navigate(['/companies/new']);
  }

  viewCompany(company: Company): void {
    this.router.navigate(['/companies', company.id]);
  }

  editCompany(company: Company): void {
    this.router.navigate(['/companies', company.id, 'edit']);
  }

  viewAllCompanies(): void {
    this.router.navigate(['/companies']);
  }

  createContract(): void {
    this.router.navigate(['/contracts/new']);
  }

  // Метод для форматирования даты
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  // Метод для форматирования цены
  formatPrice(price: number): string {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price);
  }
}