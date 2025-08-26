import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'whatsappLink' })
export class WhatsappLinkPipe implements PipeTransform {
  transform(value: string): string {
    return value.replace(/\D/g, '');
  }
}