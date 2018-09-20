import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';

import { ClientSettingsService } from '../../shared/services/client-settings/client-settings.service'; 
import { SIDEBAR_CLOSE } from '../../store/actions/client-settings.actions';

import { routerTransition } from '../../shared/animations';

// rxjs
import { Subscription } from 'rxjs/Subscription';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  animations: [routerTransition]
})
export class DashboardPage implements OnInit, OnDestroy {

  public activeSidebar: boolean = false;

  private subscribers: Subscription[] = [];

  constructor(
    private clientSettingsService: ClientSettingsService,
    private router: Router
  ) { }

  ngOnInit() {
    this.clientSettingsService.getAllState().subscribe(clientState => this.activeSidebar = clientState.sidebarIsActive);

    // handle changed route
    let routeSubscriber = this.router.events.subscribe(val => {
      if (val instanceof NavigationEnd) {
        this.closeSidebar();
      }
    });

    this.subscribers.push(routeSubscriber);
  }

  closeSidebar() {
    this.clientSettingsService.toggleSidenav({
      action: SIDEBAR_CLOSE
    })
  }

  ngOnDestroy() {
    this.subscribers.forEach(subscriber => {
      if (subscriber) subscriber.unsubscribe();
    })
  }

}
