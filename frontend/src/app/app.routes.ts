// Import the Routes type and Router from Angular router
import { Routes, Router } from '@angular/router';

// Import inject so we can use services inside the guard function
import { inject } from '@angular/core';

// Import AuthService to check if the user is logged in
import { AuthService } from './auth';

// Import both components
// In newer Angular the class is named without "Component" suffix
import { Login } from './login/login';
import { Dashboard } from './dashboard/dashboard';

// This is a route guard — runs before the dashboard loads
// If the user is not logged in it redirects them to login instead
const authGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }
  return router.createUrlTree(['/login']);
};

// Define the routes for the application
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: Login },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
];