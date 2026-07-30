import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../services/auth/auth.service';

@Component({
  selector: 'app-login-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.scss'
})
export class LoginModalComponent {
  credentials = {
    email: '',
    password: '',
  };
  errorMessage = '';

  constructor(private dialogRef: MatDialogRef<LoginModalComponent>, private authService: AuthService) {}

  closeModal(): void {
    this.dialogRef.close();
  }

  onLogin(): void {
    const user = this.authService.login(this.credentials);

    if (!user) {
      this.errorMessage = 'Email ou senha invalidos.';
      return;
    }

    this.dialogRef.close();
  }
}
