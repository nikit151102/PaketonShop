import { Routes } from '@angular/router';
import { UserComponent } from './user.component';

export const userRoutes: Routes = [
  {
    path: '',
    component: UserComponent,
    children: [
      { 
        path: '', 
        redirectTo: 'profile', 
        pathMatch: 'full' 
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./tabs/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
        data: {
          title: 'Личный кабинет — профиль | Пакетон.рф',
          description: 'Управление профилем, бонусный счёт, персональные данные, настройки уведомлений.',
          keywords: 'личный кабинет, профиль, бонусы, настройки'
        }
      },
      {
        path: 'profile/edit',
        loadComponent: () =>
          import('./tabs/user-data/user-data.component').then(
            (m) => m.UserDataComponent,
          ),
        data: {
          title: 'Редактирование профиля — Пакетон.рф',
          description: 'Изменить личные данные, телефон, email, пароль. Управление аккаунтом.',
          keywords: 'редактировать профиль, смена пароля, личные данные'
        }
      },
      {
        path: 'companies',
        loadComponent: () =>
          import('./tabs/companies/companies.component').then(
            (m) => m.CompaniesComponent,
          ),
        data: {
          title: 'Мои компании — бизнес-аккаунт | Пакетон.рф',
          description: 'Управление компаниями, счетами, сотрудниками. Оптовые заказы упаковки для юрлиц.',
          keywords: 'компании, юрлица, оптовые заказы, бизнес-аккаунт'
        }
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
        data: {
          title: 'Дашборд — аналитика заказов | Пакетон.рф',
          description: 'Статистика заказов, расходы, часто покупаемые товары. Контроль бюджета на упаковку.',
          keywords: 'дашборд, аналитика, статистика заказов'
        }
      },
      {
        path: 'orderHistory',
        loadComponent: () =>
          import('./tabs/order-history/order-history.component').then(
            (m) => m.OrderHistoryComponent,
          ),
        data: {
          title: 'История заказов — Пакетон.рф',
          description: 'Все ваши заказы упаковки: статусы, даты, суммы. Повторить заказ, отследить доставку.',
          keywords: 'история заказов, статус заказа, повторный заказ'
        }
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./tabs/products-favorite/products-favorite.component').then(
            (m) => m.ProductsFavoriteComponent,
          ),
        data: {
          title: 'Избранные товары — Пакетон.рф',
          description: 'Сохранённые товары: пакеты, коробки, скотч. Быстрый доступ к часто заказываемой упаковке.',
          keywords: 'избранное, сохраненные товары, список желаний'
        }
      },
      {
        path: 'questions',
        loadComponent: () =>
          import('./tabs/questions/questions.component').then(
            (m) => m.QuestionsComponent,
          ),
        data: {
          title: 'Вопросы и ответы — поддержка | Пакетон.рф',
          description: 'Часто задаваемые вопросы о доставке, оплате, возврате упаковки. Ответы на популярные вопросы.',
          keywords: 'вопросы, ответы, поддержка, faq'
        }
      },
      {
        path: 'delivery-addresses',
        loadComponent: () =>
          import('./tabs/delivery-addresses/delivery-addresses.component').then(
            (m) => m.DeliveryAddressesComponent,
          ),
        data: {
          title: 'Адреса доставки — Пакетон.рф',
          description: 'Сохранённые адреса для быстрого оформления заказов. Добавить, изменить, удалить адрес.',
          keywords: 'адреса доставки, сохраненные адреса, оформление заказа'
        }
      },
      {
        path: 'support',
        loadComponent: () =>
          import('./tabs/support/support.component').then(
            (m) => m.SupportComponent,
          ),
        data: {
          title: 'Поддержка — служба заботы | Пакетон.рф',
          description: 'Чат с поддержкой, заявка на звонок, обратная связь. Поможем с выбором упаковки и заказом.',
          keywords: 'поддержка, помощь, обратная связь, чат'
        }
      },
    ],
  },
];