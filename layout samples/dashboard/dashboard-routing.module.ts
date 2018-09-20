import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { DashboardPage } from './dashboard.page';

const routes: Routes = [
  {
    path: '',
    component: DashboardPage,
    children: [
      {
        path: '',
        redirectTo: 'schedule',
        pathMatch: 'full'
      },
      {
        path: 'schedule',
        loadChildren: './../+schedule/schedule.module#ScheduleModule',
        data: {
          title: 'Schedule'
        },
      },
      {
        path: 'map',
        loadChildren: './../+map/map.module#MapModule',
        data: {
            title: 'Map'
        },
      },
      {
        path: 'jobs',
        loadChildren: './../+jobs/jobs.module#JobsModule',
        data: {
            title: 'Jobs'
        },
      },
      {
        path: 'reports',
        loadChildren: './../+reports/reports.module#ReportsModule',
        data: {
            title: 'Reports'
        },
      },
      {
        path: 'alerts', 
        loadChildren: './../+alerts/alerts.module#AlertsModule'
      },
      {
        path: 'customers',
        loadChildren: './../+customers/customers.module#CustomersModule',
        data: {
            title: 'Customers'
        },
      },
      {
        path: 'settings',
        loadChildren: './../+settings/settings.module#SettingsModule'
      },
    ]
  }
];
 
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { }
