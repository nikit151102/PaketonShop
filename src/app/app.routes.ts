import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '', loadChildren: () => import('./modules/home/home.module').then(m => m.HomeModule)
    },
    {
        path: 'profile', loadChildren: () => import('./modules/user/user.module').then(m => m.UserModule)
    },
    {
        path: 'product', loadChildren: () => import('./modules/card/card.module').then(m => m.CardModule)
    },
    {
        path: 'contacts', loadChildren: () => import('./modules/contacts/contacts.module').then(m => m.ContactsModule)
    },
    {
        path: 'cart', loadChildren: () => import('./modules/cart/cart.module').then(m => m.CartModule)
    },
    {
        path: 'about', loadChildren: () => import('./modules/about/about.module').then(m => m.AboutModule)
    },
    {
        path: 'niches', loadChildren: () => import('./modules/niche-catalog/niche-catalog.module').then(m => m.NicheCatalogModule)
    },
    {
        path: 'news', loadChildren: () => import('./modules/news/news.module').then(m => m.NewsModule)
    }
];

