import { CommonModule } from '@angular/common';
import { Component, computed, inject, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-compare-common-btn',
  imports: [CommonModule, RouterLink],
  templateUrl: './compare-common-btn.component.html',
  styleUrl: './compare-common-btn.component.scss'
})
export class CompareCommonBtnComponent {
  
  private userService = inject(UserService);
  operativeInfo = computed(() => this.userService.operativeInfo())

}
