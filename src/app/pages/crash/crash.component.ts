import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgxMaskDirective } from 'ngx-mask';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../services/auth/auth.service';

type CrashRoundStatus = 'betting' | 'running' | 'crashed';
type BetFeedbackType = 'info' | 'success' | 'error';
type BetPlacementMode = 'manual' | 'auto';

interface ActiveCrashBet {
  amount: number;
  targetMultiplier: number;
  payout: number;
}

interface BetFeedback {
  message: string;
  type: BetFeedbackType;
}

interface CrashHistoryItem {
  multiplier: number;
}

interface MultiplierAxisLabel {
  multiplier: number;
  bottom: number;
}

interface TimeAxisLabel {
  seconds: number;
  left: number;
}

const MIN_CRASH_MULTIPLIER = 1;
const MAX_CRASH_MULTIPLIER = 200;
const DEFAULT_TARGET_MULTIPLIER = 2.55;
const CRASH_ANALYSIS_LIMIT = 25;
const MAX_PREVIOUS_CRASHES = CRASH_ANALYSIS_LIMIT;
const BETTING_WINDOW_MS = 7000;
const AUTO_BET_CONFIRM_BEFORE_MS = 1000;
const ROUND_RESULT_DELAY_MS = 2500;
const ROUND_TICK_MS = 40;
const CHART_LEFT_PERCENT = 12;
const CHART_WIDTH_PERCENT = 78;
const CHART_BOTTOM_PERCENT = 14;
const CHART_HEIGHT_PERCENT = 68;

@Component({
  selector: 'app-crash',
  templateUrl: './crash.component.html',
  styleUrl: './crash.component.scss',
  imports: [FormsModule, NgxMaskDirective],
})
export class CrashComponent implements OnInit, OnDestroy {
  quantia: number | string | null = null;
  targetMultiplierInput: number | string | null = DEFAULT_TARGET_MULTIPLIER;
  selectedMode = 'Normal';
  currentMultiplier = MIN_CRASH_MULTIPLIER;
  roundStatus: CrashRoundStatus = 'betting';
  previousCrashes: CrashHistoryItem[] = [];
  currentUser: User | null = null;
  activeBet: ActiveCrashBet | null = null;
  betFeedback: BetFeedback | null = null;
  hasGuaranteedWin = false;
  crashedAt: number | null = null;
  bettingRemainingMs = BETTING_WINDOW_MS;
  roundElapsedMs = 0;
  isCrashStatsModalOpen = false;
  readonly maxCrashMultiplier = MAX_CRASH_MULTIPLIER;
  readonly crashAnalysisLimit = CRASH_ANALYSIS_LIMIT;

  private crashPoint: number | null = null;
  private roundDurationMs = 0;
  private roundProgress = 0;
  private bettingStartTimestamp = 0;
  private roundStartTimestamp = 0;
  private bettingTimerId: ReturnType<typeof setInterval> | null = null;
  private roundTimerId: ReturnType<typeof setInterval> | null = null;
  private nextRoundTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private userSubscription: Subscription | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    this.userSubscription = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
    });
    this.previousCrashes = this.createInitialHistory();
    this.prepareNextRound();
  }

  ngOnDestroy(): void {
    this.stopAllTimers();
    this.userSubscription?.unsubscribe();
  }

  @HostListener('document:keydown.escape')
  closeCrashStatsModalOnEscape(): void {
    this.closeCrashStatsModal();
  }

  get isBetting(): boolean {
    return this.roundStatus === 'betting';
  }

  get isRunning(): boolean {
    return this.roundStatus === 'running';
  }

  get canPlaceBet(): boolean {
    return this.isBetting && !this.activeBet;
  }

  get actionButtonText(): string {
    if (this.activeBet) {
      return 'Aposta em andamento';
    }

    if (this.isRunning) {
      return 'Rodada em andamento';
    }

    if (this.roundStatus === 'crashed') {
      return 'Preparando rodada';
    }

    return 'Começar o jogo';
  }

  get bettingProgressPercent(): number {
    return Math.max(
      0,
      Math.min(100, ((BETTING_WINDOW_MS - this.bettingRemainingMs) / BETTING_WINDOW_MS) * 100)
    );
  }

  get selectedTargetMultiplier(): number {
    return this.getTargetMultiplier();
  }

  get chartMaxMultiplier(): number {
    return Math.min(
      MAX_CRASH_MULTIPLIER,
      Math.max(
        2,
        this.currentMultiplier,
        this.selectedTargetMultiplier || 0,
        this.crashedAt || 0
      ) * 1.14
    );
  }

  get chartLinePoints(): string {
    const progress =
      this.roundStatus === 'betting'
        ? 0
        : Math.max(this.roundProgress, this.roundStatus === 'crashed' ? 1 : 0.02);
    const startX = this.getSvgX(0);
    const startY = this.getSvgYFromProgress(0);
    const endX = this.getSvgX(progress);
    const endY = this.getSvgYFromProgress(progress);

    return `${startX},${startY} ${endX},${endY}`;
  }

  get iconLeft(): number {
    return this.getSvgX(this.roundStatus === 'betting' ? 0 : this.roundProgress);
  }

  get iconBottom(): number {
    return this.getChartBottomFromProgress(
      this.roundStatus === 'betting' ? 0 : this.roundProgress
    );
  }

  get targetSvgY(): number {
    return this.getSvgY(this.selectedTargetMultiplier);
  }

  get targetMarkerBottom(): number {
    return this.getChartBottomPercent(this.selectedTargetMultiplier);
  }

  get multiplierAxisLabels(): MultiplierAxisLabel[] {
    const maxMultiplier = this.chartMaxMultiplier;
    const middleMultiplier = MIN_CRASH_MULTIPLIER + (maxMultiplier - 1) / 2;

    return [
      {
        multiplier: maxMultiplier,
        bottom: CHART_BOTTOM_PERCENT + CHART_HEIGHT_PERCENT,
      },
      {
        multiplier: middleMultiplier,
        bottom: CHART_BOTTOM_PERCENT + CHART_HEIGHT_PERCENT / 2,
      },
      {
        multiplier: MIN_CRASH_MULTIPLIER,
        bottom: CHART_BOTTOM_PERCENT,
      },
    ];
  }

  get timeAxisLabels(): TimeAxisLabel[] {
    const maxSeconds = this.chartDurationSeconds;

    return [
      {
        seconds: 0,
        left: 12,
      },
      {
        seconds: maxSeconds / 2,
        left: 45,
      },
      {
        seconds: maxSeconds,
        left: 78,
      },
    ];
  }

  get chartDurationSeconds(): number {
    if (this.isRunning) {
      return Math.max(4, this.roundElapsedMs / 1000);
    }

    if (this.roundStatus === 'crashed') {
      return Math.max(4, this.roundDurationMs / 1000);
    }

    return 4;
  }

  get recentCrashAnalysis(): CrashHistoryItem[] {
    return this.previousCrashes.slice(0, CRASH_ANALYSIS_LIMIT);
  }

  get crashAnalysisTotal(): number {
    return this.recentCrashAnalysis.length;
  }

  toggleMode(mode: string): void {
    this.selectedMode = mode;
  }

  startRound(): void {
    if (this.activeBet) {
      this.setBetFeedback('Aguarde o resultado da aposta em andamento.', 'info');
      return;
    }

    if (!this.isBetting) {
      this.setBetFeedback('Aguarde a proxima rodada para apostar.', 'info');
      return;
    }

    this.placeBet('manual');
  }

  halfBet(): void {
    const betAmount = this.getBetAmount();

    if (betAmount > 0) {
      this.quantia = this.toCurrencyValue(betAmount / 2);
    }
  }

  doubleBet(): void {
    const betAmount = this.getBetAmount();

    if (betAmount > 0) {
      this.quantia = this.toCurrencyValue(betAmount * 2);
    }
  }

  clearMultiplier(): void {
    this.targetMultiplierInput = null;
    this.betFeedback = null;
  }

  openCrashStatsModal(): void {
    this.isCrashStatsModalOpen = true;
  }

  closeCrashStatsModal(): void {
    this.isCrashStatsModalOpen = false;
  }

  formatAmount(amount: number): string {
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatMultiplier(multiplier: number): string {
    return multiplier.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatSeconds(seconds: number): string {
    return `${seconds.toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    })}s`;
  }

  formatCountdown(milliseconds: number): string {
    return (milliseconds / 1000).toLocaleString('pt-BR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
  }

  private placeBet(mode: BetPlacementMode): boolean {
    if (!this.currentUser) {
      this.setBetFeedback('Entre na sua conta para começar o jogo.', 'error');
      this.stopAutoModeIfNeeded(mode);
      return false;
    }

    const betAmount = this.getBetAmount();
    const targetMultiplier = this.getTargetMultiplier();

    if (betAmount <= 0) {
      if (mode === 'manual') {
        this.setBetFeedback('Informe uma quantia valida para apostar.', 'error');
      }
      return false;
    }

    if (targetMultiplier < 1.01 || targetMultiplier > MAX_CRASH_MULTIPLIER) {
      if (mode === 'manual') {
        this.setBetFeedback('Escolha um multiplicador entre 1,01x e 200x.', 'error');
      }
      return false;
    }

    if (betAmount > this.currentUser.balance) {
      this.setBetFeedback('Saldo insuficiente para essa aposta.', 'error');
      this.stopAutoModeIfNeeded(mode);
      return false;
    }

    this.activeBet = {
      amount: betAmount,
      targetMultiplier,
      payout: this.toCurrencyValue(betAmount * targetMultiplier),
    };

    this.authService.updateBalance(
      this.toCurrencyValue(this.currentUser.balance - betAmount)
    );
    this.setBetFeedback(
      `${mode === 'auto' ? 'Aposta automatica' : 'Aposta'} de R$ ${this.formatAmount(
        betAmount
      )} em ${this.formatMultiplier(
        targetMultiplier
      )}x confirmada.`,
      'info'
    );

    return true;
  }

  private tryAutoBet(): void {
    if (
      this.selectedMode !== 'Auto' ||
      !this.canPlaceBet ||
      this.bettingRemainingMs > AUTO_BET_CONFIRM_BEFORE_MS
    ) {
      return;
    }

    this.placeBet('auto');
  }

  private stopAutoModeIfNeeded(mode: BetPlacementMode): void {
    if (mode === 'auto') {
      this.selectedMode = 'Normal';
    }
  }

  private prepareNextRound(): void {
    this.stopAllTimers();
    this.crashPoint = this.generateCrashPoint();
    this.roundDurationMs = this.getRoundDurationMs(this.crashPoint);
    this.roundProgress = 0;
    this.roundElapsedMs = 0;
    this.currentMultiplier = MIN_CRASH_MULTIPLIER;
    this.roundStatus = 'betting';
    this.hasGuaranteedWin = false;
    this.crashedAt = null;
    this.bettingRemainingMs = BETTING_WINDOW_MS;
    this.bettingStartTimestamp = Date.now();

    this.bettingTimerId = setInterval(() => this.tickBettingWindow(), ROUND_TICK_MS);
  }

  private tickBettingWindow(): void {
    const elapsedMs = Date.now() - this.bettingStartTimestamp;
    const remainingMs = BETTING_WINDOW_MS - elapsedMs;
    this.bettingRemainingMs = Math.max(0, remainingMs);
    this.tryAutoBet();

    if (remainingMs <= 0) {
      this.startCrashRun();
    }
  }

  private startCrashRun(): void {
    this.stopBettingTimer();
    this.roundStatus = 'running';
    this.roundStartTimestamp = Date.now();
    this.roundElapsedMs = 0;
    this.roundProgress = 0;
    this.currentMultiplier = MIN_CRASH_MULTIPLIER;
    this.roundTimerId = setInterval(() => this.tickRound(), ROUND_TICK_MS);
  }

  private tickRound(): void {
    if (!this.crashPoint) {
      return;
    }

    const elapsedMs = Date.now() - this.roundStartTimestamp;
    const progress = Math.min(elapsedMs / this.roundDurationMs, 1);
    const rawMultiplier =
      MIN_CRASH_MULTIPLIER +
      (this.crashPoint - MIN_CRASH_MULTIPLIER) * progress;

    this.roundElapsedMs = elapsedMs;
    this.roundProgress = progress;
    this.currentMultiplier = this.toMultiplierValue(
      progress >= 1 ? this.crashPoint : rawMultiplier
    );

    if (
      this.activeBet &&
      !this.hasGuaranteedWin &&
      this.crashPoint >= this.activeBet.targetMultiplier &&
      rawMultiplier >= this.activeBet.targetMultiplier
    ) {
      this.guaranteeActiveBet();
    }

    if (progress >= 1) {
      this.finishRound();
    }
  }

  private guaranteeActiveBet(): void {
    if (!this.activeBet || !this.currentUser) {
      return;
    }

    this.hasGuaranteedWin = true;
    this.authService.updateBalance(
      this.toCurrencyValue(this.currentUser.balance + this.activeBet.payout)
    );
    this.setBetFeedback(
      `Vitoria garantida em ${this.formatMultiplier(
        this.activeBet.targetMultiplier
      )}x. Premio: R$ ${this.formatAmount(this.activeBet.payout)}.`,
      'success'
    );
  }

  private finishRound(): void {
    if (!this.crashPoint) {
      return;
    }

    const finishedCrashPoint = this.crashPoint;
    const finishedBet = this.activeBet;

    this.stopRoundTimer();
    this.roundStatus = 'crashed';
    this.currentMultiplier = finishedCrashPoint;
    this.crashedAt = finishedCrashPoint;
    this.crashPoint = null;
    this.roundProgress = 1;
    this.roundElapsedMs = this.roundDurationMs;
    this.previousCrashes = [
      {
        multiplier: finishedCrashPoint,
      },
      ...this.previousCrashes,
    ].slice(0, MAX_PREVIOUS_CRASHES);

    if (finishedBet && !this.hasGuaranteedWin) {
      this.setBetFeedback(
        `Crash em ${this.formatMultiplier(finishedCrashPoint)}x. Voce perdeu R$ ${this.formatAmount(
          finishedBet.amount
        )}.`,
        'error'
      );
    } else if (finishedBet) {
      this.setBetFeedback(
        `Crash em ${this.formatMultiplier(
          finishedCrashPoint
        )}x. Vitoria paga em ${this.formatMultiplier(finishedBet.targetMultiplier)}x.`,
        'success'
      );
    }

    this.activeBet = null;
    this.nextRoundTimeoutId = setTimeout(() => {
      this.prepareNextRound();
    }, ROUND_RESULT_DELAY_MS);
  }

  private generateCrashPoint(): number {
    const roll = Math.random();
    const rawMultiplier = 0.97 / Math.max(1 - roll, 0.00485);

    return this.toMultiplierValue(
      Math.min(
        MAX_CRASH_MULTIPLIER,
        Math.max(MIN_CRASH_MULTIPLIER, rawMultiplier)
      )
    );
  }

  private getRoundDurationMs(crashPoint: number): number {
    const normalized =
      Math.log(Math.max(crashPoint, MIN_CRASH_MULTIPLIER)) /
      Math.log(MAX_CRASH_MULTIPLIER);

    return 1200 + normalized * 7800;
  }

  private getBetAmount(): number {
    return this.parseDecimalInput(this.quantia);
  }

  private getTargetMultiplier(): number {
    return this.parseDecimalInput(this.targetMultiplierInput);
  }

  private parseDecimalInput(value: number | string | null): number {
    if (value === null || value === undefined) {
      return 0;
    }

    if (typeof value === 'number') {
      return this.toCurrencyValue(value);
    }

    const rawValue = value.trim();
    const normalizedValue = rawValue.includes(',')
      ? rawValue.replace(/\./g, '').replace(',', '.')
      : rawValue;
    const amount = Number(normalizedValue);

    return Number.isFinite(amount) ? this.toCurrencyValue(amount) : 0;
  }

  private createInitialHistory(): CrashHistoryItem[] {
    return Array.from({ length: CRASH_ANALYSIS_LIMIT }, () => ({
      multiplier: this.generateCrashPoint(),
    }));
  }

  private getSvgX(progress: number): number {
    return (
      CHART_LEFT_PERCENT +
      Math.min(Math.max(progress, 0), 1) * CHART_WIDTH_PERCENT
    );
  }

  private getSvgY(multiplier: number): number {
    return 100 - this.getChartBottomPercent(multiplier);
  }

  private getChartBottomPercent(multiplier: number): number {
    const safeMax = Math.max(2, this.chartMaxMultiplier);
    const safeMultiplier = Math.min(Math.max(multiplier, 1), safeMax);
    const normalized = (safeMultiplier - MIN_CRASH_MULTIPLIER) / (safeMax - MIN_CRASH_MULTIPLIER);

    return CHART_BOTTOM_PERCENT + normalized * CHART_HEIGHT_PERCENT;
  }

  private getSvgYFromProgress(progress: number): number {
    return 100 - this.getChartBottomFromProgress(progress);
  }

  private getChartBottomFromProgress(progress: number): number {
    return (
      CHART_BOTTOM_PERCENT +
      Math.min(Math.max(progress, 0), 1) * CHART_HEIGHT_PERCENT
    );
  }

  private stopRoundTimer(): void {
    if (!this.roundTimerId) {
      return;
    }

    clearInterval(this.roundTimerId);
    this.roundTimerId = null;
  }

  private stopBettingTimer(): void {
    if (!this.bettingTimerId) {
      return;
    }

    clearInterval(this.bettingTimerId);
    this.bettingTimerId = null;
  }

  private clearNextRoundTimeout(): void {
    if (!this.nextRoundTimeoutId) {
      return;
    }

    clearTimeout(this.nextRoundTimeoutId);
    this.nextRoundTimeoutId = null;
  }

  private stopAllTimers(): void {
    this.stopBettingTimer();
    this.stopRoundTimer();
    this.clearNextRoundTimeout();
  }

  private setBetFeedback(message: string, type: BetFeedbackType): void {
    this.betFeedback = {
      message,
      type,
    };
  }

  private toMultiplierValue(value: number): number {
    return Math.round(value * 100) / 100;
  }

  private toCurrencyValue(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
