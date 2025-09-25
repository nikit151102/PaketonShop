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
          import('./tabs/user-data/user-data.component').then(
            (m) => m.UserDataComponent
          ),
      },
      {
        path: 'orderHistory',
        loadComponent: () =>
          import('./tabs/order-history/order-history.component').then(
            (m) => m.OrderHistoryComponent
          ),
      },
      {
        path: 'currentOrders',
        loadComponent: () =>
          import('./tabs/current-orders/current-orders.component').then(
            (m) => m.CurrentOrdersComponent
          ),
      },
      {
        path: 'questions',
        loadComponent: () =>
          import('./tabs/questions/questions.component').then(
            (m) => m.QuestionsComponent
          ),
      },
      {
        path: 'delivery-addresses',
        loadComponent: () =>
          import('./tabs/delivery-addresses/delivery-addresses.component').then(
            (m) => m.DeliveryAddressesComponent
          ),
      },
    ],
  },
];