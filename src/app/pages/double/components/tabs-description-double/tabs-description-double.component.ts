import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';

export type BettingColor = 'red' | 'white' | 'black';
type BadgeTier = 'gold' | 'diamond' | 'platinum';
type BetResultStatus = 'won' | 'lost';

interface SimulatedBet {
  id: number;
  user: string;
  amount: number;
  badge: BadgeTier;
  resultStatus?: BetResultStatus;
  settledAmount?: number;
}

interface RouletteColumn {
  color: BettingColor;
  title: string;
  iconSrc: string;
  iconAlt: string;
  bets: SimulatedBet[];
  total: number;
  displayedTotal: number;
  hiddenPlayers: number;
}

const MAX_VISIBLE_BETS = 10;
const BETTING_COLUMNS: Array<
  Pick<RouletteColumn, 'color' | 'title' | 'iconSrc' | 'iconAlt'>
> = [
  {
    color: 'red',
    title: 'Vitória 2X',
    iconSrc: 'assets/images/red-box.svg',
    iconAlt: 'vermelho',
  },
  {
    color: 'white',
    title: 'Vitória 14X',
    iconSrc: 'assets/images/logo_white.jpg',
    iconAlt: 'branco',
  },
  {
    color: 'black',
    title: 'Vitória 2X',
    iconSrc: 'assets/images/black-box.svg',
    iconAlt: 'preto',
  },
];

const RANDOM_USERS = [
  'ana_lima',
  'bruno77',
  'caiosilva',
  'duda_play',
  'felipe10',
  'gabiwin',
  'henrique',
  'isabela',
  'joao_victor',
  'karolzinha',
  'leo_cash',
  'luana.bet',
  'marcos88',
  'nanda',
  'pedro_fx',
  'rafa_blaze',
  'sara7',
  'thiagox',
  'vitor_rj',
  'yasmin',
];

const BADGE_BY_TIER: Record<BadgeTier, string> = {
  gold: 'assets/images/gold.svg',
  diamond: 'assets/images/diamond.svg',
  platinum: 'assets/images/platinum.svg',
};

@Component({
  selector: 'app-tabs-description-double',
  imports: [CommonModule, MatTabsModule],
  templateUrl: './tabs-description-double.component.html',
  styleUrl: './tabs-description-double.component.scss',
})
export class TabsDescriptionDoubleComponent implements OnDestroy {
  activeTabIndex = 0;
  betColumns: RouletteColumn[] = this.createEmptyColumns();

  private betId = 0;
  private simulationDeadline = 0;
  private betSimulationTimeout: ReturnType<typeof setTimeout> | null = null;
  private stopSimulationTimeout: ReturnType<typeof setTimeout> | null = null;
  private totalAnimationFrames = new Map<BettingColor, number>();

  ngOnDestroy(): void {
    this.stopBetSimulation();
    this.cancelTotalAnimations();
  }

  onTabChange(index: number): void {
    console.log(`Aba ativa: ${index}`);
  }

  startBetSimulation(duration: number): void {
    this.stopBetSimulation();
    this.resetBets();

    const safeDuration = Math.max(0, duration);
    this.simulationDeadline = Date.now() + Math.max(0, safeDuration - 650);

    this.stopSimulationTimeout = setTimeout(() => {
      this.stopBetSimulation();
    }, Math.max(0, safeDuration - 120));

    this.scheduleNextBet(180);
  }

  settleRound(winningColor: BettingColor): void {
    this.stopBetSimulation();
    this.cancelTotalAnimations();

    this.betColumns = this.betColumns.map((column) => {
      const isWinnerColumn = column.color === winningColor;

      return {
        ...column,
        displayedTotal: column.total,
        bets: this.sortBetsByAmount(
          column.bets.map((bet) => ({
            ...bet,
            resultStatus: isWinnerColumn ? 'won' : 'lost',
            settledAmount: isWinnerColumn
              ? this.toCurrencyValue(bet.amount * this.getMultiplier(column.color))
              : bet.amount,
          }))
        ),
      };
    });
  }

  stopBetSimulation(): void {
    if (this.betSimulationTimeout) {
      clearTimeout(this.betSimulationTimeout);
      this.betSimulationTimeout = null;
    }

    if (this.stopSimulationTimeout) {
      clearTimeout(this.stopSimulationTimeout);
      this.stopSimulationTimeout = null;
    }
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  getBadgeIcon(badge: BadgeTier): string {
    return BADGE_BY_TIER[badge];
  }

  private resetBets(): void {
    this.cancelTotalAnimations();
    this.betColumns = this.createEmptyColumns();
  }

  private createEmptyColumns(): RouletteColumn[] {
    return BETTING_COLUMNS.map((column) => ({
      ...column,
      bets: [],
      total: 0,
      displayedTotal: 0,
      hiddenPlayers: this.getRandomInt(38, 180),
    }));
  }

  private scheduleNextBet(delay: number): void {
    this.betSimulationTimeout = setTimeout(() => {
      if (Date.now() >= this.simulationDeadline) {
        this.stopBetSimulation();
        return;
      }

      this.addRandomBet();
      this.scheduleNextBet(this.getRandomInt(320, 780));
    }, delay);
  }

  private addRandomBet(): void {
    const color = this.pickNextColor();
    const bet = this.createRandomBet(color);

    this.betColumns = this.betColumns.map((column) => {
      if (column.color !== color) {
        return column;
      }

      const total = this.toCurrencyValue(column.total + bet.amount);
      this.animateTotal(column.color, column.displayedTotal, total);

      return {
        ...column,
        bets: this.sortBetsByAmount([...column.bets, bet]).slice(
          0,
          MAX_VISIBLE_BETS
        ),
        total,
        hiddenPlayers: column.hiddenPlayers + this.getRandomInt(1, 5),
      };
    });
  }

  private pickNextColor(): BettingColor {
    const leastFilledColumn = [...this.betColumns].sort(
      (left, right) => left.bets.length - right.bets.length
    )[0];

    if (leastFilledColumn.bets.length < 2) {
      return leastFilledColumn.color;
    }

    const weights: BettingColor[] = [
      'red',
      'red',
      'red',
      'black',
      'black',
      'black',
      'white',
    ];

    return weights[this.getRandomInt(0, weights.length - 1)];
  }

  private createRandomBet(color: BettingColor): SimulatedBet {
    return {
      id: ++this.betId,
      user: this.getRandomUser(),
      amount: this.getRandomBetAmount(color),
      badge: this.getRandomBadge(),
    };
  }

  private getRandomUser(): string {
    const name = RANDOM_USERS[this.getRandomInt(0, RANDOM_USERS.length - 1)];
    return `${name}${this.getRandomInt(1, 99)}`;
  }

  private getRandomBadge(): BadgeTier {
    const badges: BadgeTier[] = ['gold', 'diamond', 'platinum'];
    return badges[this.getRandomInt(0, badges.length - 1)];
  }

  private getRandomBetAmount(color: BettingColor): number {
    const isHighBet = Math.random() > 0.84;
    const max = color === 'white' ? 240 : 980;
    const amount = isHighBet
      ? this.getRandomInt(1000, 4200)
      : this.getRandomInt(8, max);
    const cents = this.getRandomInt(0, 99) / 100;

    return this.toCurrencyValue(amount + cents);
  }

  private sortBetsByAmount(bets: SimulatedBet[]): SimulatedBet[] {
    return [...bets].sort((left, right) => right.amount - left.amount);
  }

  private getMultiplier(color: BettingColor): number {
    return color === 'white' ? 14 : 2;
  }

  private animateTotal(
    color: BettingColor,
    fromValue: number,
    toValue: number
  ): void {
    const existingFrame = this.totalAnimationFrames.get(color);

    if (existingFrame) {
      cancelAnimationFrame(existingFrame);
    }

    const startedAt = performance.now();
    const duration = 520;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const nextValue = this.toCurrencyValue(
        fromValue + (toValue - fromValue) * easedProgress
      );

      this.setDisplayedTotal(color, nextValue);

      if (progress < 1) {
        const frame = requestAnimationFrame(tick);
        this.totalAnimationFrames.set(color, frame);
        return;
      }

      this.setDisplayedTotal(color, toValue);
      this.totalAnimationFrames.delete(color);
    };

    const frame = requestAnimationFrame(tick);
    this.totalAnimationFrames.set(color, frame);
  }

  private setDisplayedTotal(color: BettingColor, value: number): void {
    this.betColumns = this.betColumns.map((column) =>
      column.color === color
        ? {
            ...column,
            displayedTotal: value,
          }
        : column
    );
  }

  private cancelTotalAnimations(): void {
    this.totalAnimationFrames.forEach((frame) => cancelAnimationFrame(frame));
    this.totalAnimationFrames.clear();
  }

  private getRandomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private toCurrencyValue(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
