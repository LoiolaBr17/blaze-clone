import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ViewChild,
  ElementRef,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { NgxMaskDirective } from 'ngx-mask';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../services/auth/auth.service';
import { TabsDescriptionDoubleComponent } from './components/tabs-description-double/tabs-description-double.component';
import { FooterComponent } from '../../shared/components/footer/footer.component';

type DrawnColor = 'red' | 'black' | 'white';
type BetFeedbackType = 'info' | 'success' | 'error';

interface DrawnResult {
  value: string;
  color: DrawnColor;
}

interface PendingBet {
  amount: number;
  color: DrawnColor;
}

interface BetFeedback {
  message: string;
  type: BetFeedbackType;
}

const MAX_PREVIOUS_SPINS = 26;

@Component({
  selector: 'app-double',
  templateUrl: './double.component.html',
  styleUrls: ['./double.component.scss'],
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    FormsModule,
    TabsDescriptionDoubleComponent,
    FooterComponent,
    NgxMaskDirective,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DoubleComponent implements OnDestroy, OnInit {
  @ViewChild('mySwiper', { static: true }) swiperEl!: ElementRef;
  @ViewChild('progressBar', { static: true }) progressBarEl!: ElementRef;
  @ViewChild('progressText', { static: true }) progressTextEl!: ElementRef;

  isCountingDown: boolean = false;
  quantia: number | string | null = null;
  selectedMode: string = 'Normal';
  selectedColor: DrawnColor = 'red';
  drawnResult: DrawnResult | null = null;
  previousSpins: DrawnResult[] = [];
  currentUser: User | null = null;
  activeBet: PendingBet | null = null;
  betFeedback: BetFeedback | null = null;

  private countdownInterval: any;
  private spinInterval: ReturnType<typeof setInterval> | null = null;
  private spinSettleTimeout: ReturnType<typeof setTimeout> | null = null;
  private userSubscription: Subscription | null = null;
  private labels: string[] = [
    ...Array.from({ length: 14 }, (_, i) => `red-${i + 1}`),
    ...Array.from({ length: 14 }, (_, i) => `black-${i + 1}`),
    'white',
  ];

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
    });
    this.startCarousel();
  }

  ngOnDestroy(): void {
    clearInterval(this.countdownInterval);
    this.userSubscription?.unsubscribe();
    if (this.spinInterval) {
      clearInterval(this.spinInterval);
    }
    if (this.spinSettleTimeout) {
      clearTimeout(this.spinSettleTimeout);
    }
  }

  private startCarousel(): void {
    this.startCountdown(3000, () => {
      this.spinToRandomLabel();
    });
  }

  private spinToRandomLabel(): void {
    const swiper = this.swiperEl.nativeElement.swiper;
    const randomLabel = this.getRandomLabel();
    const targetIndex = this.getIndexByLabel(randomLabel, swiper);
    this.drawnResult = null;

    if (targetIndex === -1) {
      console.error('Label não encontrada no carrossel');
      return;
    }

    swiper.autoplay.stop();

    const totalSlides = swiper.slides.length;
    const currentIndex = swiper.realIndex;
    const fullLoops = totalSlides * 4;

    let steps = fullLoops + (targetIndex - currentIndex);
    if (steps < 0) {
      steps += totalSlides;
    }

    swiper.params.speed = 60;

    if (this.spinInterval) {
      clearInterval(this.spinInterval);
    }

    this.spinInterval = setInterval(() => {
      if (steps > 0) {
        swiper.slideNext(60, true);
        steps--;
      } else {
        if (this.spinInterval) {
          clearInterval(this.spinInterval);
          this.spinInterval = null;
        }
        this.spinSettleTimeout = setTimeout(() => {
          this.stopCarousel(swiper);
        }, swiper.params.speed);
      }
    }, 10);
  }

  private stopCarousel(swiper: any): void {
    this.updateDrawnResultFromCenteredCard();
    this.startCountdown(15000, () => {
      this.spinToRandomLabel();
    });
  }

  private updateDrawnResultFromCenteredCard(): void {
    const centeredCard = this.getCenteredCard();

    if (!centeredCard) {
      this.drawnResult = null;
      return;
    }

    const value = centeredCard.querySelector<HTMLElement>('.white-rounded')
      ?.textContent
      ?.trim();
    const color = this.getCardColor(centeredCard);

    const result: DrawnResult = {
      value: value || 'Branco',
      color,
    };
    this.drawnResult = result;
    this.recordPreviousSpin(result);
    this.settleActiveBet(result);
  }

  private recordPreviousSpin(result: DrawnResult): void {
    this.previousSpins = [result, ...this.previousSpins].slice(
      0,
      MAX_PREVIOUS_SPINS
    );
  }

  private getCenteredCard(): HTMLElement | null {
    const carousel = this.swiperEl.nativeElement.closest(
      '.container-carrosel'
    ) as HTMLElement | null;
    const carouselRect = carousel?.getBoundingClientRect();
    const centerX = carouselRect
      ? carouselRect.left + carouselRect.width / 2
      : window.innerWidth / 2;
    const cards = Array.from(
      this.swiperEl.nativeElement.querySelectorAll('.card')
    ) as HTMLElement[];

    return cards.reduce<HTMLElement | null>((closestCard, card) => {
      const cardRect = card.getBoundingClientRect();

      if (!cardRect.width || !cardRect.height) {
        return closestCard;
      }

      if (!closestCard) {
        return card;
      }

      const cardDistance = Math.abs(
        cardRect.left + cardRect.width / 2 - centerX
      );
      const closestRect = closestCard.getBoundingClientRect();
      const closestDistance = Math.abs(
        closestRect.left + closestRect.width / 2 - centerX
      );

      return cardDistance < closestDistance ? card : closestCard;
    }, null);
  }

  private getCardColor(card: HTMLElement): DrawnColor {
    if (card.classList.contains('red')) {
      return 'red';
    }

    if (card.classList.contains('black')) {
      return 'black';
    }

    return 'white';
  }

  private startCountdown(duration: number, callback: () => void): void {
    const progressBar = this.progressBarEl.nativeElement;
    const progressText = this.progressTextEl.nativeElement;
    const start = Date.now();

    this.isCountingDown = true;
    clearInterval(this.countdownInterval);

    this.countdownInterval = setInterval(() => {
      const elapsed = Date.now() - start;
      const remaining = duration - elapsed;
      const percentage = 100 - (elapsed / duration) * 100;
      progressBar.style.transform = `scaleX(${Math.max(0, percentage / 100)})`;

      if (remaining > 0) {
        const seconds = (remaining / 1000).toFixed(2);
        progressText.textContent = `Girando Em ${seconds}`;
      }

      if (remaining <= 0) {
        clearInterval(this.countdownInterval);
        this.isCountingDown = false;
        progressBar.style.width = '100%';
        progressText.textContent = '';
        callback();
      }
    }, 100);
  }

  private getRandomLabel(): string {
    return this.labels[Math.floor(Math.random() * this.labels.length)];
  }

  private getIndexByLabel(label: string, swiper: any): number {
    const slides = swiper.slides;
    for (let i = 0; i < slides.length; i++) {
      if (slides[i].querySelector(`.card.${label}`)) {
        return i;
      }
    }
    return -1;
  }

  toggleMode(mode: string): void {
    this.selectedMode = mode;
  }

  selectColor(color: DrawnColor): void {
    if (this.activeBet) {
      return;
    }

    this.selectedColor = color;
  }

  betIn(): void {
    if (this.activeBet) {
      this.setBetFeedback('Aguarde o resultado da aposta em andamento.', 'info');
      return;
    }

    if (!this.isCountingDown) {
      this.setBetFeedback('Aguarde o giro terminar para apostar novamente.', 'info');
      return;
    }

    if (!this.currentUser) {
      this.setBetFeedback('Entre na sua conta para começar o jogo.', 'error');
      return;
    }

    const betAmount = this.getBetAmount();

    if (betAmount <= 0) {
      this.setBetFeedback('Informe uma quantia valida para apostar.', 'error');
      return;
    }

    if (betAmount > this.currentUser.balance) {
      this.setBetFeedback('Saldo insuficiente para essa aposta.', 'error');
      return;
    }

    this.activeBet = {
      amount: betAmount,
      color: this.selectedColor,
    };
    this.authService.updateBalance(
      this.toCurrencyValue(this.currentUser.balance - betAmount)
    );
    this.setBetFeedback(
      `Aposta de R$ ${this.formatAmount(betAmount)} no ${this.getColorLabel(
        this.selectedColor
      )} confirmada.`,
      'info'
    );
  }

  halfBet(): void {
    if (this.activeBet) {
      return;
    }

    const betAmount = this.getBetAmount();
    if (betAmount > 0) {
      this.quantia = this.toCurrencyValue(betAmount / 2);
    }
  }
  
  doubleBet(): void {
    if (this.activeBet) {
      return;
    }

    const betAmount = this.getBetAmount();
    if (betAmount > 0) {
      this.quantia = this.toCurrencyValue(betAmount * 2);
    }
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  getColorLabel(color: DrawnColor): string {
    const labelsByColor: Record<DrawnColor, string> = {
      red: 'vermelho',
      black: 'preto',
      white: 'branco',
    };

    return labelsByColor[color];
  }

  private settleActiveBet(result: DrawnResult): void {
    if (!this.activeBet) {
      return;
    }

    const bet = this.activeBet;
    this.activeBet = null;

    if (!this.currentUser) {
      this.setBetFeedback('A aposta foi encerrada, mas nao ha usuario logado.', 'error');
      return;
    }

    const resultColor = this.getColorLabel(result.color);

    if (result.color !== bet.color) {
      this.setBetFeedback(
        `Saiu ${resultColor}. Voce perdeu R$ ${this.formatAmount(bet.amount)}.`,
        'error'
      );
      return;
    }

    const multiplier = bet.color === 'white' ? 14 : 2;
    const payout = this.toCurrencyValue(bet.amount * multiplier);
    this.authService.updateBalance(
      this.toCurrencyValue(this.currentUser.balance + payout)
    );
    this.setBetFeedback(
      `Saiu ${resultColor}. Voce ganhou R$ ${this.formatAmount(payout)}!`,
      'success'
    );
  }

  private getBetAmount(): number {
    if (this.quantia === null || this.quantia === undefined) {
      return 0;
    }

    if (typeof this.quantia === 'number') {
      return this.toCurrencyValue(this.quantia);
    }

    const rawValue = this.quantia.trim();
    const normalizedValue = rawValue.includes(',')
      ? rawValue.replace(/\./g, '').replace(',', '.')
      : rawValue;
    const amount = Number(normalizedValue);

    return Number.isFinite(amount) ? this.toCurrencyValue(amount) : 0;
  }

  private setBetFeedback(message: string, type: BetFeedbackType): void {
    this.betFeedback = {
      message,
      type,
    };
  }

  private toCurrencyValue(value: number): number {
    return Math.round(value * 100) / 100;
  }  
}
