import { Pipe, PipeTransform } from '@angular/core';

// 1. Пайп для одиночной строки
@Pipe({ name: 'cleanStringLink' })
export class CleanStringLinkPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    return value.trim().replace(/;$/, '');
  }
}

// 2. Пайп для массива строк
@Pipe({ name: 'cleanArrayLink' })
export class CleanArrayLinkPipe implements PipeTransform {
  transform(value: string[] | string): string[] {
    if (!value) return [];

    const clean = (link: string) => link.trim().replace(/;$/, '');
    return Array.isArray(value) ? value.map(clean) : [clean(value)];
  }
}
