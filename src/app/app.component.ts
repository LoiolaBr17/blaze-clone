import { Component, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './shared/components/header/header.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { provideNgxMask, NgxMaskConfig } from 'ngx-mask';
import { Subscription } from 'rxjs';
import { AuthService, User } from './services/auth/auth.service';

const maskConfig: Partial<NgxMaskConfig> = {
  validation: false,
  thousandSeparator: '.',
  decimalMarker: ',',
  // prefix: 'R$ ',
};
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HeaderComponent,
    MatExpansionModule,
  ],
  providers: [provideNgxMask(maskConfig)],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnDestroy {
  title = 'clone-blaze';
  bonusButtonText = 'Ganhe R$100';
  isBonusOnCooldown = false;

  private readonly bonusAmount = 100;
  private readonly bonusCooldownMs = 5 * 60 * 1000;
  private readonly bonusStoragePrefix = 'blaze-free-bonus-next-claim-at';
  private bonusTimerId: ReturnType<typeof setInterval> | null = null;
  private currentUser: User | null = null;
  private readonly userSubscription: Subscription;

  constructor(private authService: AuthService) {
    this.userSubscription = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
      this.syncBonusCooldown();
    });
  }

  ngOnDestroy(): void {
    this.userSubscription.unsubscribe();
    this.stopBonusTimer();
  }

  claimBonus(): void {
    if (!this.currentUser || this.isBonusOnCooldown) {
      return;
    }

    this.authService.updateBalance(this.currentUser.balance + this.bonusAmount);

    const nextClaimAt = Date.now() + this.bonusCooldownMs;
    this.saveNextClaimAt(this.currentUser.id, nextClaimAt);
    this.startBonusTimer(nextClaimAt);
  }

  private syncBonusCooldown(): void {
    if (!this.currentUser) {
      this.stopBonusTimer();
      this.setBonusAvailable();
      return;
    }

    const nextClaimAt = this.getStoredNextClaimAt(this.currentUser.id);

    if (nextClaimAt > Date.now()) {
      this.startBonusTimer(nextClaimAt);
      return;
    }

    this.clearNextClaimAt(this.currentUser.id);
    this.stopBonusTimer();
    this.setBonusAvailable();
  }

  private startBonusTimer(nextClaimAt: number): void {
    this.stopBonusTimer();
    this.updateCooldownButton(nextClaimAt);
    this.bonusTimerId = setInterval(() => this.updateCooldownButton(nextClaimAt), 1000);
  }

  private updateCooldownButton(nextClaimAt: number): void {
    const remainingMs = nextClaimAt - Date.now();

    if (remainingMs <= 0) {
      if (this.currentUser) {
        this.clearNextClaimAt(this.currentUser.id);
      }

      this.stopBonusTimer();
      this.setBonusAvailable();
      return;
    }

    this.isBonusOnCooldown = true;
    this.bonusButtonText = `Resgatar em ${this.formatRemainingTime(remainingMs)}`;
  }

  private stopBonusTimer(): void {
    if (!this.bonusTimerId) {
      return;
    }

    clearInterval(this.bonusTimerId);
    this.bonusTimerId = null;
  }

  private setBonusAvailable(): void {
    this.isBonusOnCooldown = false;
    this.bonusButtonText = 'Ganhe R$100';
  }

  private formatRemainingTime(milliseconds: number): string {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  private getStoredNextClaimAt(userId: number): number {
    const value = this.readLocalStorage(this.getBonusStorageKey(userId));
    const nextClaimAt = Number(value);

    return Number.isFinite(nextClaimAt) ? nextClaimAt : 0;
  }

  private saveNextClaimAt(userId: number, nextClaimAt: number): void {
    try {
      window.localStorage.setItem(this.getBonusStorageKey(userId), String(nextClaimAt));
    } catch {
      return;
    }
  }

  private clearNextClaimAt(userId: number): void {
    try {
      window.localStorage.removeItem(this.getBonusStorageKey(userId));
    } catch {
      return;
    }
  }

  private readLocalStorage(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private getBonusStorageKey(userId: number): string {
    return `${this.bonusStoragePrefix}-${userId}`;
  }
}
