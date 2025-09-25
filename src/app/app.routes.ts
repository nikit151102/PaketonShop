import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '', loadComponent: () => import('./modules/home/home.component').then(m => m.HomeComponent)
    },
    {
        path: 'profile/:id',
        loadChildren: () => import('./modules/user/user-routes').then(m => m.userRoutes),
    },
    {
        path: 'product/:id', loadComponent: () => import('./modules/card/card.component').then(m => m.CardComponent)
    },
    {
        path: 'contacts', loadComponent: () => import('./modules/contacts/contacts.component').then(m => m.ContactsComponent)
    },
    {
        path: 'cart', loadComponent: () => import('./modules/cart/cart.component').then(m => m.CartComponent)
    },
    {
        path: 'about', loadComponent: () => import('./modules/about/about.component').then(m => m.AboutComponent)
    },
    {
        path: 'niches', loadComponent: () => import('./modules/niche-catalog/niche-catalog.component').then(m => m.NicheCatalogComponent)
    },
    {
        path: 'news', loadComponent: () => import('./modules/news/news.module').then(m => m.NewsModule)
    },
    {
        path: 'notifications', loadComponent: () => import('./modules/notifications/notifications.component').then(m => m.NotificationsComponent)
    },
    {
        path: 'category/:id', loadComponent: () => import('./modules/categories/categories.component').then(m => m.CategoriesComponent)
    },
    {
        path: 'products/:id', loadComponent: () => import('./modules/products/products.component').then(m => m.ProductsComponent)
    },
    {
        path: 'compare', loadComponent: () => import('./modules/compare-products/compare-products.component').then(m => m.CompareProductsComponent)
    },
];

