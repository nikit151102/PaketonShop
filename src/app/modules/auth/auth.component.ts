import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AuthService } from './auth.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';

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

  constructor(private authService: AuthService, private fb: FormBuilder) {
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

}
