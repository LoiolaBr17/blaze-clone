import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';


@Component({
  selector: 'app-register-modal',
  imports: [],
  templateUrl: './register-modal.component.html',
  styleUrl: './register-modal.component.scss'
})
export class RegisterModalComponent {
    constructor(private dialogRef: MatDialogRef<RegisterModalComponent>) {}
  
  closeModal(): void {
    this.dialogRef.close(); // Fecha o modal
  }
}
