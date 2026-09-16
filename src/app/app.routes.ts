import { Routes } from '@angular/router';
import { Home } from './pages/home/home';

export const routes: Routes = [
  { path: '', component: Home },
  {
    path: 'about',
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
  },
  {
    path: 'contact',
    loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
  },
  {
    path: 'services',
    loadComponent: () => import('./pages/services/services').then((m) => m.Services),
  },
  {
    path: 'services/:title',
    loadComponent: () => import('./pages/form/form').then((m) => m.Form),
  },
  {
    path: 'thank-you',
    loadComponent: () => import('./pages/thank-you/thank-you').then((m) => m.ThankYou),
  },
  {
    path: 'user-terms',
    loadComponent: () => import('./pages/user-terms/user-terms').then((m) => m.UserTerms),
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./pages/privacy-policy/privacy-policy').then((m) => m.PrivacyPolicy),
  },
  {
    path: 'california-policy',
    loadComponent: () => import('./pages/california-policy/california-policy').then((m) => m.CaliforniaPolicy),
  },
  {
    path: 'partner-companies',
    loadComponent: () => import('./pages/partner-companies/partner-companies').then((m) => m.PartnerCompanies),
  },
  {
    path: 'Unsubscribe',
    loadComponent: () => import('./pages/unsubscribe/unsubscribe').then((m) => m.Unsubscribe),
  },
  { path: 'unsubscribe', redirectTo: 'Unsubscribe', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];
