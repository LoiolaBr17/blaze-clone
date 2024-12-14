import { Component } from '@angular/core';
import {
  FormControl,
  FormGroupDirective,
  NgForm,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import { MatDialogRef } from '@angular/material/dialog';



@Component({
  selector: 'app-login-modal',
  imports: [FormsModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './login-modal.component.html',
  styleUrl: './login-modal.component.scss'
})
export class LoginModalComponent {
  emailFormControl = new FormControl('', [Validators.required, Validators.email]);

  constructor(private dialogRef: MatDialogRef<LoginModalComponent>) {}

  closeModal(): void {
    this.dialogRef.close(); // Fecha o modal
  }
}
