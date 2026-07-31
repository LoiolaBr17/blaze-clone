import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/double/double.component').then((module) => module.DoubleComponent),
  },
  {
    path: 'crash',
    loadComponent: () =>
      import('./pages/crash/crash.component').then((module) => module.CrashComponent),
  },
  {
    path: 'mine-rush',
    loadComponent: () =>
      import('./pages/mine-rush/mine-rush.component').then(
        (module) => module.MineRushComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
