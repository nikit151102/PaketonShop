import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

@Component({
  selector: 'app-loyalty',
  imports: [CommonModule],
  templateUrl: './loyalty.component.html',
  styleUrl: './loyalty.component.scss'
})
export class LoyaltyComponent {

  loyaltyLevels = [
    { name: 'Разведчик', min: 0, crown: 'crown/1level.png' },
    { name: 'Постоялец', min: 50000, crown: 'crown/2level.png' },
    { name: 'Настоящий ценитель', min: 75000, crown: 'crown/3level.png' },
    { name: 'Легенда', min: 100000, crown: 'crown/4level.png' },
    { name: 'Мастер крупных покупок', min: 150000, crown: 'crown/5level.png' },
    { name: 'Король большого шоппинга', min: 200000, crown: 'crown/6level.png' }
  ];

  currentAmount = 82000; // пример суммы заказов

  get currentLevel() {
    return [...this.loyaltyLevels].reverse().find(l => this.currentAmount >= l.min);
  }

  get nextLevel() {
    return this.loyaltyLevels.find(l => l.min > this.currentAmount);
  }

  get progressPercent() {
    if (!this.nextLevel) return 100;
    const prevMin = this.currentLevel?.min;
    const nextMin = this.nextLevel.min;
    if (prevMin)
      return ((this.currentAmount - prevMin) / (nextMin - prevMin)) * 100;
    else
      return
  }

}
