import { Component, Input } from '@angular/core';
import { Partner } from '../../../../../../../models/partner.interface';

@Component({
  selector: 'app-partner-detail',
  imports: [],
  templateUrl: './partner-detail.component.html',
  styleUrl: './partner-detail.component.scss'
})
export class PartnerDetailComponent {
  @Input() partner!: Partner;
  @Input() closeCallback!: () => void;

  close() {
    if (this.closeCallback) this.closeCallback();
  }
}
