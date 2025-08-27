import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../modules/auth/auth.service';
import { AboutRoutingModule } from "../../../modules/about/about-routing.module";
import { IconsComponent } from './components/icons/icons.component';
import { LogoComponent } from './components/logo/logo.component';
import { MenuComponent } from './components/menu/menu.component';
import { SearchComponent } from './components/search/search.component';

@Component({
  selector: 'app-header',
  imports: [CommonModule, FormsModule, AboutRoutingModule, LogoComponent, MenuComponent, SearchComponent, IconsComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})

export class HeaderComponent {
  mobileMenuOpen = false;

  constructor(private authService: AuthService, private router: Router) { }

  goHome() {
    this.router.navigate(['/']);
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  getAuth() {
    this.authService.changeVisible(true);
  }

  megaMenuOpen = false;
  selectedNiche: string = 'all';

  niches = [
    {
      id: 'all',
      name: 'Все',
      categories: []
    },

    {
      id: 'electronics',
      name: 'Электроника',
      categories: ['Смартфоны', 'Ноутбуки', 'Телевизоры']
    },
    {
      id: 'fashion',
      name: 'Мода',
      categories: ['Женская одежда', 'Мужская одежда', 'Обувь']
    },
    {
      id: 'home',
      name: 'Дом и сад',
      categories: ['Мебель', 'Инструменты', 'Декор']
    },
    {
      id: 'autos',
      name: 'Авто',
      categories: ['Машины', 'Мотоциклы', 'Запчасти']
    }
  ];

  openMegaMenu() {
    this.megaMenuOpen = true;
  }

  closeMegaMenu() {
    this.megaMenuOpen = false;
  }

  selectNiche(nicheId: string) {
    this.selectedNiche = nicheId;
  }

  toggleMegaMenu(event: Event) {
    event.preventDefault();
    this.megaMenuOpen = !this.megaMenuOpen;
  }


}