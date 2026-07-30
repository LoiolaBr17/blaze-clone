import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  balance: number;
}

interface StoredUser extends User {
  password: string;
}

export interface Credentials {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private userSubject: BehaviorSubject<User | null> = new BehaviorSubject<User | null>(null);
  private users: StoredUser[] = [
    {
      id: 1,
      name: 'Usuario Teste',
      email: 'teste@gmail.com',
      password: '123',
      balance: 500000,
    },
  ];
  private nextUserId = 2;

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
      const storedUser = this.users.find((user) => user.id === currentUser.id);
      if (storedUser) {
        storedUser.balance = newBalance;
      }
    }
  }

  // Cria um usuário na memória e já o deixa autenticado
  register(credentials: Credentials): User | null {
    const email = this.normalizeEmail(credentials.email);
    const password = credentials.password.trim();

    if (!email || !password || this.users.some((user) => user.email === email)) {
      return null;
    }

    const user: StoredUser = {
      id: this.nextUserId++,
      name: email.split('@')[0] || 'Usuario',
      email,
      password,
      balance: 0,
    };

    this.users.push(user);
    this.setLoggedUser(user);

    return this.toUser(user);
  }

  // Realiza o login com usuários cadastrados em memória
  login(credentials: Credentials): User | null {
    const email = this.normalizeEmail(credentials.email);
    const password = credentials.password.trim();
    const user = this.users.find(
      (storedUser) => storedUser.email === email && storedUser.password === password
    );

    if (!user) {
      return null;
    }

    this.setLoggedUser(user);
    return this.toUser(user);
  }

  // Realiza o logout e limpa o usuário
  logout(): void {
    this.userSubject.next(null);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private setLoggedUser(user: StoredUser): void {
    this.userSubject.next(this.toUser(user));
  }

  private toUser(user: StoredUser): User {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      balance: user.balance,
    };
  }
}
