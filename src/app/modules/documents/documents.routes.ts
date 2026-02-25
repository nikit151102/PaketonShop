import { Routes } from '@angular/router';
import { DocumentsComponent } from './documents.component';


export const documentsRoutes: Routes = [
  {
    path: '',
    component: DocumentsComponent,
  },
  {
    path: 'offer',
    loadComponent: () =>
      import('./tabs/offer/offer.component').then(
        (m) => m.OfferComponent,
      ),
  },
  {
    path: 'partnership',
    loadComponent: () =>
      import('./tabs/partnership-agreement/partnership-agreement.component').then(
        (m) => m.PartnershipAgreementComponent,
      ),
  },
  {
    path: 'consent',
    loadComponent: () =>
      import('./tabs/newsletter-consent/newsletter-consent.component').then(
        (m) => m.NewsletterConsentComponent,
      ),
  },
];


