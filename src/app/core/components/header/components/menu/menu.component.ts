import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MegaMenuComponent } from '../mega-menu/mega-menu.component';

@Component({
  selector: 'app-menu',
  imports: [RouterLink, MegaMenuComponent],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.scss'
})
export class MenuComponent {
 megaMenuOpen = false;
  selectedNiche = 'electronics';
  niches = [
    { id: 'all', name: 'Все', categories: [] },
    { id: 'electronics', name: 'Электроника', categories: ['Смартфоны','Ноутбуки','Телевизоры'] },
    { id: 'fashion', name: 'Мода', categories: ['Женская одежда','Мужская одежда','Обувь'] },
    { id: 'home', name: 'Дом и сад', categories: ['Мебель','Инструменты','Декор'] },
    { id: 'autos', name: 'Авто', categories: ['Машины','Мотоциклы','Запчасти'] }
  ];

  toggleMegaMenu(event: Event) {
    event.preventDefault();
    this.megaMenuOpen = !this.megaMenuOpen;
  }

  selectNiche(nicheId: string) {
    this.selectedNiche = nicheId;
  }
}
