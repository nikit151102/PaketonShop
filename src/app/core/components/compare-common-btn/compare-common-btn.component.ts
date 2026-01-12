import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-compare-common-btn',
  imports: [CommonModule, RouterLink],
  templateUrl: './compare-common-btn.component.html',
  styleUrl: './compare-common-btn.component.scss'
})
export class CompareCommonBtnComponent {
  @Input() showHeader: boolean = false;
}
