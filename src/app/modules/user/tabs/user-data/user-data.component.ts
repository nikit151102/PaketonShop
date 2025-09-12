import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PartnerCardsComponent } from './partner-cards/partner-cards.component';
import { LoyaltyComponent } from './loyalty/loyalty.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UserService } from '../../../../core/services/user.service';

@Component({
  selector: 'app-user-data',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, PartnerCardsComponent, LoyaltyComponent],
  templateUrl: './user-data.component.html',
  styleUrls: ['./user-data.component.scss']
})
export class UserDataComponent implements OnInit {
  userForm!: FormGroup;

  constructor(private fb: FormBuilder, private userService: UserService) {}

  ngOnInit(): void {
    this.userForm = this.fb.group({
      avatar: [''],
      lastName: ['', Validators.required],
      firstName: ['', Validators.required],
      middleName: [''],
      birthDate: [''],
      phone: [''],
      email: ['', [Validators.email]]
    });

    this.userService.user$.subscribe((user: any) => {
      if (user) {
        this.userForm.patchValue({
          avatar: user.avatar,
          lastName: user.lastName,
          firstName: user.firstName,
          middleName: user.middleName,
          birthDate: user.birthDate,
          phone: user.phone,
          email: user.email
        });
      }
    });
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      console.log('Данные формы:', this.userForm.value);
      // this.userService.updateUser(this.userForm.value).subscribe({
      //   next: (res) => console.log('Профиль обновлен', res),
      //   error: (err) => console.error(err)
      // });
    } else {
      console.warn('Форма не валидна');
      this.userForm.markAllAsTouched();
    }
  }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      console.log('Выбран аватар', file);
    }
  }
}
