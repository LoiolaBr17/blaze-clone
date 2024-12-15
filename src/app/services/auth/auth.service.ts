import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  balance: number;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);

  constructor() {}

  // Obtém o usuário como Observable para que seja reativo
  get user$(): Observable<User | null> {
    return this.userSubject.asObservable();
  }

  // Atualiza o saldo do usuário
  updateBalance(newBalance: number): void {
    const currentUser = this.userSubject.value;
    if (currentUser) {
      this.userSubject.next({ ...currentUser, balance: newBalance });
    }
  }

  // Realiza o login e atualiza o usuário
  login(credentials: { email: string; password: string }): void {
    // Simula um login bem-sucedido
    const user: User = {
      id: 1,
      name: 'John Doe',
      balance: 100.0,
    };
    this.userSubject.next(user);
  }

  // Realiza o logout e limpa o usuário
  logout(): void {
    this.userSubject.next(null);
  }

}
