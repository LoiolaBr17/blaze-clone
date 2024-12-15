import { Component } from '@angular/core';
import { LoginModalComponent } from '../login-modal/login-modal.component';
import { MatDialog } from '@angular/material/dialog';
import { RegisterModalComponent } from '../register-modal/register-modal.component';
import { AuthService, User } from '../../../services/auth/auth.service';
import { Observable } from 'rxjs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  user$: Observable<User | null>;

  constructor(private dialog: MatDialog, private authService: AuthService) {
    this.user$ = this.authService.user$;
  }

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

  onLogout(): void {
    this.authService.logout();
  }
}
