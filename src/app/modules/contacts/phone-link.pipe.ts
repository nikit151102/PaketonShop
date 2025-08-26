import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'phoneLink' })
export class PhoneLinkPipe implements PipeTransform {
  transform(value: string): string {
    return value.replace(/\D/g, ''); // Убираем все символы кроме цифр
  }
}