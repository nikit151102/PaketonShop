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
    }

    
];
