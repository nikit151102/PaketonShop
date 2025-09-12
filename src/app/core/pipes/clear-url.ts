import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'cleanLink' })
export class CleanLinkPipe implements PipeTransform {
  transform(value: string): string {
    return value?.replace(/;$/, '');
  }
}
