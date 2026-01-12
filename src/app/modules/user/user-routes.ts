import { Routes } from '@angular/router';
import { UserComponent } from './user.component';

export const userRoutes: Routes = [
  {
    path: '',
    component: UserComponent,
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        loadComponent: () =>
          import('./tabs/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'profile/edit',
        loadComponent: () =>
          import('./tabs/user-data/user-data.component').then(
            (m) => m.UserDataComponent,
          ),
      },
            {
        path: 'companies',
        loadComponent: () =>
          import('./tabs/companies/companies.component').then(
            (m) => m.CompaniesComponent,
          ),
      },
      
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },

      {
        path: 'orderHistory',
        loadComponent: () =>
          import('./tabs/order-history/order-history.component').then(
            (m) => m.OrderHistoryComponent,
          ),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./tabs/products-favorite/products-favorite.component').then(
            (m) => m.ProductsFavoriteComponent,
          ),
      },

      {
        path: 'questions',
        loadComponent: () =>
          import('./tabs/questions/questions.component').then(
            (m) => m.QuestionsComponent,
          ),
      },
      {
        path: 'delivery-addresses',
        loadComponent: () =>
          import('./tabs/delivery-addresses/delivery-addresses.component').then(
            (m) => m.DeliveryAddressesComponent,
          ),
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./tabs/support/support.component').then(
            (m) => m.SupportComponent,
          ),
      },
    ],
  },
];
