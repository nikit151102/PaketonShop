import { CanDeactivateFn } from '@angular/router';
import { EditOrderComponent } from '../../modules/edit-order/edit-order.component';

export const unsavedChangesGuard: CanDeactivateFn<EditOrderComponent> = (component) => {
  if (component.hasUnsavedChanges) {
    const changes = component.getUnsavedChangesSummary();
    
    let message = 'У вас есть несохранённые изменения:\n\n';
    
    if (changes.removed.length > 0) {
      message += `🗑️ Удалено товаров: ${changes.removed.length}\n`;
      changes.removed.slice(0, 3).forEach(name => {
        message += `   • ${name}\n`;
      });
      if (changes.removed.length > 3) {
        message += `   ... и ещё ${changes.removed.length - 3}\n`;
      }
      message += '\n';
    }
    
    if (changes.changed.length > 0) {
      message += `📝 Изменено количество: ${changes.changed.length}\n`;
      changes.changed.slice(0, 3).forEach(item => {
        message += `   • ${item.name}: ${item.newQty} шт.\n`;
      });
      if (changes.changed.length > 3) {
        message += `   ... и ещё ${changes.changed.length - 3}\n`;
      }
    }
    
    message += '\nВы уверены, что хотите выйти без сохранения?';
    
    return confirm(message);
  }
  return true;
};