import { Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './auth';
import { Login } from './login/login';
import { Patients } from './patients/patients';

const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'patients', component: Patients, canActivate: [authGuard] },
];