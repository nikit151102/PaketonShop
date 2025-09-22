import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { StorageUtils } from '../../../utils/storage.utils';
import { localStorageEnvironment, sessionStorageEnvironment } from '../../../environment';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {

  visible: boolean = false;
  authForm: FormGroup;
  isError: any;
  authMode: 'login' | 'register' = 'login';
  constructor(private authService: AuthService, private fb: FormBuilder, private userService: UserService) {
    this.authForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required,]],

    });
  }

  ngOnInit(): void {
    this.authService.visiblePopUp$.subscribe((value: boolean) => {
      this.visible = value;
    })
  }

  closePopUp() {
    this.authService.changeVisible(false);
  }

  onSubmit(): void {
    if (this.authMode === 'login') {
      const data = {
        ...this.authForm.value,
        // userName: this.authForm.value.email
      };
      this.authService.login(data.userName, data.email, data.password).subscribe({
        next: (response: any) => {
          this.closePopUp();
          this.userService.setUser(response.data, false)
          StorageUtils.setLocalStorageCache(localStorageEnvironment.auth.key, response.data.token, localStorageEnvironment.auth.ttl)
        },
        error: (error) => {
          console.error('Login failed', error);
        }
      })
    } else {
      const data = {
        ...this.authForm.value,
        isEmailSend: "false"
      };
      this.authService.register(data).subscribe({
        next: res => this.closePopUp(),
        error: err => this.isError = err
      });
    }
  }

}
