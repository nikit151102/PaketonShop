import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./modules/home/home.component').then((m) => m.HomeComponent),
    data: { 
      reuse: true,
      title: 'Главная — Пакетон.рф | Упаковка оптом и в розницу',
      description: 'Пакеты, коробки, скотч, стрейч-плёнка с доставкой по России. Низкие цены, скидки от объёма. Более 1000 товаров в наличии.',
      keywords: 'упаковка оптом, пакеты, коробки, скотч, стрейч-плёнка'
    }
  },
  {
    path: 'profile',
    loadChildren: () => import('./modules/user/user-routes').then((m) => m.userRoutes),
    data: {
      title: 'Личный кабинет — Пакетон.рф',
      description: 'Управление заказами, бонусный счёт, адреса доставки и настройки профиля.',
      keywords: 'личный кабинет, заказы, бонусы'
    }
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./modules/card/card.component').then((m) => m.CardComponent),
    data: {
      title: '{{productName}} — купить в Пакетон.рф',
      description: '{{productName}} — цена {{price}} ₽, характеристики, фото, отзывы. Доставка по России. Закажите сейчас!',
    }
  },
  {
    path: 'contacts',
    loadComponent: () => import('./modules/contacts/contacts.component').then((m) => m.ContactsComponent),
    data: {
      title: 'Контакты и магазины — Пакетон.рф',
      description: 'Адреса магазинов, телефоны, email, реквизиты, схема проезда. Режим работы и контактная информация.',
      keywords: 'контакты, магазины упаковки, адрес, телефон'
    }
  },
  {
    path: 'cart',
    loadComponent: () => import('./modules/cart/cart.component').then((m) => m.CartComponent),
    data: {
      title: 'Корзина — Пакетон.рф',
      description: 'Ваши выбранные товары. Оформление заказа с доставкой по России. Быстрая покупка упаковки.',
      keywords: 'корзина, оформление заказа, купить'
    }
  },
  {
    path: 'about',
    loadComponent: () => import('./modules/about/about.component').then((m) => m.AboutComponent),
    data: {
      title: 'О компании — Пакетон.рф',
      description: 'История компании, преимущества, производство, сертификаты. Почему выбирают нас для покупки упаковки оптом.',
      keywords: 'о компании, производитель упаковки, сертификаты'
    }
  },
  {
    path: 'news',
    loadComponent: () => import('./modules/news/news.component').then((m) => m.NewsComponent),
    data: {
      title: 'Новости и акции — Пакетон.рф',
      description: 'Актуальные новости, скидки, распродажи упаковки. Будьте в курсе выгодных предложений.',
      keywords: 'новости, акции, скидки на упаковку'
    }
  },
  {
    path: 'news/:id',
    loadComponent: () => import('./modules/news-detail/news-detail.component').then((m) => m.NewsDetailComponent),
    data: {
      title: '{{newsTitle}} — новости Пакетон.рф',
      description: '{{newsExcerpt}} Читайте подробности на сайте.',
    }
  },
  {
    path: 'shop/:id',
    loadComponent: () => import('./modules/shop-details/shop-details.component').then((m) => m.ShopDetailsComponent),
    data: {
      title: 'Магазин упаковки {{shopName}} — адрес, телефон, режим работы',
      description: 'Магазин {{shopName}} по адресу {{shopAddress}}. В наличии пакеты, коробки, скотч. Работаем ежедневно.',
    }
  },
  {
    path: 'stores',
    loadComponent: () => import('./modules/shops/shops.component').then((m) => m.ShopsComponent),
    data: {
      title: 'Магазины упаковки — адреса на карте | Пакетон.рф',
      description: 'Все магазины Пакетон.рф на карте. Адреса, телефоны, схема проезда, режим работы. Выберите ближайший.',
      keywords: 'магазины упаковки, адреса магазинов, где купить'
    }
  },
  {
    path: 'niches',
    loadComponent: () => import('./modules/niche-catalog/niche-catalog.component').then((m) => m.NicheCatalogComponent),
    data: {
      title: 'Каталог упаковки по сферам бизнеса — Пакетон.рф',
      description: 'Упаковка для ресторанов, магазинов, складов, маркетплейсов. Подбор под ваш бизнес. Оптом и в розницу.',
      keywords: 'упаковка для бизнеса, ниши, отрасли'
    }
  },
  {
    path: 'niche/:id',
    loadComponent: () => import('./modules/niche-products/niche-products.component').then((m) => m.NicheProductsComponent),
    data: {
      title: '{{nicheName}} — упаковка для {{nicheName}} | Пакетон.рф',
      description: '{{nicheName}} — профессиональная упаковка. Пакеты, коробки, расходные материалы. Цены от производителя.',
    }
  },
  {
    path: 'notifications',
    loadComponent: () => import('./modules/notifications/notifications.component').then((m) => m.NotificationsComponent),
    data: {
      title: 'Уведомления — Пакетон.рф',
      description: 'Ваши уведомления о статусе заказов, акциях и бонусах.',
    }
  },
  {
    path: 'category/:id',
    loadComponent: () => import('./modules/categories/categories.component').then((m) => m.CategoriesComponent),
    data: {
      title: '{{categoryName}} — каталог | Пакетон.рф',
      description: '{{categoryName}} в ассортименте. Выберите размер, плотность, тип. Доставка по России.',
    }
  },
  {
    path: 'order/:id',
    loadComponent: () => import('./modules/order/order.component').then((m) => m.OrderComponent),
    data: {
      title: 'Заказ №{{orderId}} — статус | Пакетон.рф',
      description: 'Статус заказа №{{orderId}}. История, трекинг, доставка упаковки.',
    }
  },
  {
    path: 'compare',
    loadComponent: () => import('./modules/compare-products/compare-products.component').then((m) => m.CompareProductsComponent),
    data: {
      title: 'Сравнение товаров — Пакетон.рф',
      description: 'Сравните характеристики упаковки, цены и размеры. Выберите лучший вариант.',
      keywords: 'сравнение товаров, выбрать упаковку'
    }
  },
  {
    path: 'register-business',
    loadComponent: () => import('./modules/business-account-registration/business-account-registration.component').then((m) => m.BusinessAccountRegistrationComponent),
    data: {
      title: 'Регистрация бизнес-аккаунта | Пакетон.рф',
      description: 'Оптовые цены, отсрочка платежа, персональный менеджер для юрлиц и ИП. Зарегистрируйте бизнес-аккаунт.',
      keywords: 'бизнес-аккаунт, оптовая упаковка, юрлицам'
    }
  },
  {
    path: 'documents',
    loadChildren: () => import('./modules/documents/documents.routes').then((m) => m.documentsRoutes),
    data: {
      title: 'Документы и политика — Пакетон.рф',
      description: 'Пользовательское соглашение, политика конфиденциальности, публичная оферта, реквизиты.',
      keywords: 'документы, оферта, политика конфиденциальности'
    }
  },
];