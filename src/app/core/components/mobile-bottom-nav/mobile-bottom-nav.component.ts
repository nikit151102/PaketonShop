import { Component } from '@angular/core';

@Component({
  selector: 'app-mobile-bottom-nav',
  imports: [],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrl: './mobile-bottom-nav.component.scss'
})
export class MobileBottomNavComponent {
  activeTab: string = 'home';

  changeTab(tab: string) {
    this.activeTab = tab;
  }

}
