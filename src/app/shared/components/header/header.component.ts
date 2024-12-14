import { Component } from '@angular/core';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { RegisterModalComponent } from '../register-modal/register-modal.component';



@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {
  constructor(private dialog: MatDialog) {}

  openLoginModal(): void {
    this.dialog.open(LoginModalComponent, {
      minWidth: '300px',
      maxWidth: '670px',
      minHeight: '247px',
      maxHeight: '500px',
      panelClass: 'custom-dialog-container',
      data: {},
    });
  }

  openRegisterModal(): void {
    this.dialog.open(RegisterModalComponent, {
      minWidth: '740px',
      panelClass: 'teste',
      data: {},
    });
  }
}
