import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'plural',
  standalone: true
})
export class PluralPipe implements PipeTransform {
  transform(value: number): string {
    const lastDigit = value % 10;
    const lastTwoDigits = value % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 19) {
      return 'ов';
    }
    
    switch (lastDigit) {
      case 1:
        return '';
      case 2:
      case 3:
      case 4:
        return 'а';
      default:
        return 'ов';
    }
  }
}