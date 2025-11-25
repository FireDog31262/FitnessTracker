import { Routes } from '@angular/router';
import { authGuard } from './Components/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./Components/welcome/welcome').then(m => m.Welcome)
  },
  {
    path: 'signup',
    loadComponent: () => import('./Components/auth/sign-up/sign-up').then(m => m.SignUp)
  },
  {
    path: 'login',
    loadComponent: () => import('./Components/auth/login/login').then(m => m.Login)
  },
  {
    path: 'training',
    loadComponent: () => import('./Components/training/training/training').then(m => m.Training),
    canActivate: [authGuard]
  },
  {
    path: 'user-exercises',
    loadComponent: () => import('./Components/training/user-exercises/user-exercises').then(m => m.UserExercises),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./Components/auth/profile/profile').then(m => m.Profile),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: '' } // Wildcard route for 404 handling
];
