import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'capitalizeFirst',
  standalone: true
})
export class CapitalizeFirstPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return value;
    // Первую букву делаем заглавной, а ВСЕ ОСТАЛЬНЫЕ — строчными
    return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(); 
  }
}