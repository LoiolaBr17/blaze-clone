import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { AuthService } from '../../../services/auth/auth.service';


@Component({
  selector: 'app-register-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './register-modal.component.html',
  styleUrl: './register-modal.component.scss'
})
export class RegisterModalComponent {
  registerData = {
    email: '',
    password: '',
    cpf: '',
  };
  errorMessage = '';

  constructor(
    private dialogRef: MatDialogRef<RegisterModalComponent>,
    private authService: AuthService
  ) {}
  
  closeModal(): void {
    this.dialogRef.close(); // Fecha o modal
  }

  onRegister(): void {
    const user = this.authService.register(this.registerData);

    if (!user) {
      this.errorMessage = 'Informe email e senha validos ou use outro email.';
      return;
    }

    this.dialogRef.close();
  }
}
