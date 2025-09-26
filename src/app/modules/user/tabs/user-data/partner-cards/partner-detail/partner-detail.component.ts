import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Partner } from '../../../../../../../models/partner.interface';

@Component({
  selector: 'app-partner-detail',
  imports: [],
  templateUrl: './partner-detail.component.html',
  styleUrl: './partner-detail.component.scss'
})
export class PartnerDetailComponent {
  @Input() partner!: any;
  @Output() closeCallback = new EventEmitter<void>();

  closeModal() {
    this.closeCallback.emit();
  }
}
