import { Component } from '@angular/core';
import {
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../services/auth/auth.service';



@Component({
  selector: 'app-login-modal',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.scss'
})
export class LoginModalComponent {
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);
  credentials = {
    email: '',
    password: '',
  };

  constructor(private dialogRef: MatDialogRef<LoginModalComponent>, private authService: AuthService) {}

  closeModal(): void {
    this.dialogRef.close();
  }

  onLogin(): void {
    this.authService.login(this.credentials);
    this.dialogRef.close();
  }
}
