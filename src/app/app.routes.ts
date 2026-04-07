import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./modules/home/home.component').then((m) => m.HomeComponent),
    data: { reuse: true }
  },
  {
    path: 'profile',
    loadChildren: () =>
      import('./modules/user/user-routes').then((m) => m.userRoutes),
  },
  {
    path: 'auth/yandex-callback',
    loadComponent: () =>
      import('./modules/home/home.component').then((m) => m.HomeComponent),
    data: { reuse: true }
  },
  {
    path: 'product/:id',
    loadComponent: () =>
      import('./modules/card/card.component').then((m) => m.CardComponent),
  },
  {
    path: 'contacts',
    loadComponent: () =>
      import('./modules/contacts/contacts.component').then(
        (m) => m.ContactsComponent,
      ),
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./modules/cart/cart.component').then((m) => m.CartComponent),
  },
  {
    path: 'about',
    loadComponent: () =>
      import('./modules/about/about.component').then((m) => m.AboutComponent),
  },
  {
    path: 'news',
    loadComponent: () =>
      import('./modules/news/news.component').then((m) => m.NewsComponent),
  },
  {
    path: 'news/:id',
    loadComponent: () =>
      import('./modules/news-detail/news-detail.component').then((m) => m.NewsDetailComponent),
  },
  {
    path: 'shop/:id',
    loadComponent: () =>
      import('./modules/shop-details/shop-details.component').then((m) => m.ShopDetailsComponent),
  },
  {
    path: 'stores',
    loadComponent: () =>
      import('./modules/shops/shops.component').then((m) => m.ShopsComponent),
  },
  {
    path: 'niches',
    loadComponent: () =>
      import('./modules/niche-catalog/niche-catalog.component').then(
        (m) => m.NicheCatalogComponent,
      ),
  },
  {
    path: 'niche/:id',
    loadComponent: () =>
      import('./modules/niche-products/niche-products.component').then(
        (m) => m.NicheProductsComponent,
      ),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./modules/notifications/notifications.component').then(
        (m) => m.NotificationsComponent,
      ),
  },
  {
    path: 'category/:id',
    loadComponent: () =>
      import('./modules/categories/categories.component').then(
        (m) => m.CategoriesComponent,
      ),
  },
  {
    path: 'order/:id',
    loadComponent: () =>
      import('./modules/order/order.component').then(
        (m) => m.OrderComponent,
      ),
  },
  {
    path: 'compare',
    loadComponent: () =>
      import('./modules/compare-products/compare-products.component').then(
        (m) => m.CompareProductsComponent,
      ),
  },
  {
    path: 'register-business',
    loadComponent: () =>
      import('./modules/business-account-registration/business-account-registration.component').then(
        (m) => m.BusinessAccountRegistrationComponent,
      ),
  },
  {
    path: 'documents',
    loadChildren: () =>
      import('./modules/documents/documents.routes').then((m) => m.documentsRoutes)
  },

];
