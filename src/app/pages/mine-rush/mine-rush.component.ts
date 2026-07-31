import { Component, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../../services/auth/auth.service';
import {
  MINE_RUSH_ENTRY_STEP,
  MINE_RUSH_LOW_RETURN_GROUP_SYMBOL_IDS,
  MINE_RUSH_LOW_RETURN_MAX_PERCENT,
  MINE_RUSH_MIN_GROUP_SIZE,
  MINE_RUSH_SYMBOLS,
  MineRushCell,
  MineRushScore,
  MineRushSymbol,
  MineRushSymbolId,
  calculateMineRushScore,
  calculateMineRushSequenceRoundScore,
  createMineRushBoard,
  getMineRushSequenceChancePercent,
  limitMineRushPayoutToMaxWin,
  normalizeMineRushEntry,
} from './mine-rush-game';

const SPIN_DURATION_MS = 1300;
const CREDIT_DELAY_MS = 1100;
const NEXT_SEQUENCE_ROUND_DELAY_MS = 520;
const ROW_SPIN_TICK_MS = [56, 68, 80, 92, 104];
const TOAST_DURATION_MS = 3200;
const MIN_SEQUENCE_ROUNDS = 2;
const MAX_SEQUENCE_ROUNDS = 100;
const DOUBLE_LUCK_COST_MULTIPLIER = 2;
const DOUBLE_LUCK_CHANCE_MULTIPLIER = 2;

type MineRushFeedbackType = 'info' | 'success' | 'error';

interface MineRushFeedback {
  message: string;
  type: MineRushFeedbackType;
}

interface MineRushPendingPayout {
  amount: number;
}

interface MineRushSequenceResult {
  amount: number;
  rounds: number;
}

interface MineRushInfoRow {
  id: MineRushSymbolId;
  label: string;
  asset: string;
  returnText: string;
  sequenceChanceText: string;
}

@Component({
  selector: 'app-mine-rush',
  templateUrl: './mine-rush.component.html',
  styleUrl: './mine-rush.component.scss',
})
export class MineRushComponent implements OnDestroy {
  readonly minGroupSize = MINE_RUSH_MIN_GROUP_SIZE;
  readonly entryStep = MINE_RUSH_ENTRY_STEP;
  readonly sequenceRoundPresets = [5, 10, 15, 20, 25, 50];
  readonly infoRows = [...MINE_RUSH_SYMBOLS]
    .sort((left, right) => left.multiplier - right.multiplier)
    .map((symbol) => createMineRushInfoRow(symbol));

  board = createMineRushBoard();
  score = this.createEmptyScore();
  entryValue = MINE_RUSH_ENTRY_STEP;
  totalScore = 0;
  roundNumber = 0;
  hasPlayed = false;
  isSpinning = false;
  isCreditPending = false;
  isRoundsModalOpen = false;
  isInfoModalOpen = false;
  isDoubleLuckEnabled = false;
  sequenceRoundCount = 5;
  sequenceTotalRounds = 0;
  sequencePlayedRounds = 0;
  sequenceResult: MineRushSequenceResult | null = null;
  currentRoundPayout = 0;
  currentUser: User | null = null;
  feedback: MineRushFeedback | null = null;
  pendingPayout: MineRushPendingPayout | null = null;

  private sequenceAccumulatedPayout = 0;
  private sequenceTotalBetValue = 0;
  private rowSpinIntervalIds: ReturnType<typeof setInterval>[] = [];
  private spinTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private creditTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private nextSequenceRoundTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private toastTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private winningCellKeys = new Set<string>();
  private readonly userSubscription: Subscription;

  constructor(private authService: AuthService) {
    this.userSubscription = this.authService.user$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  ngOnDestroy(): void {
    this.clearSpinTimers();
    this.clearCreditTimer();
    this.clearNextSequenceRoundTimer();
    this.clearToastTimer();
    this.userSubscription.unsubscribe();
  }

  get isSequenceActive(): boolean {
    return this.sequenceTotalRounds > 0;
  }

  get sequenceRemainingRounds(): number {
    return Math.max(0, this.sequenceTotalRounds - this.sequencePlayedRounds);
  }

  get sequenceTotalCost(): number {
    return this.toCurrencyValue(
      this.entryValue * this.sequenceRoundCount * this.sequenceCostMultiplier
    );
  }

  get canSkipSequenceAnimations(): boolean {
    return (
      this.isSequenceActive &&
      !this.isCreditPending &&
      (this.isSpinning || this.sequenceRemainingRounds > 0)
    );
  }

  get headerPayoutValue(): number {
    if (this.isSequenceActive) {
      return this.sequenceAccumulatedPayout;
    }

    return (
      this.sequenceResult?.amount ??
      this.pendingPayout?.amount ??
      this.currentRoundPayout
    );
  }

  playRound(): void {
    if (this.isRoundLocked) {
      return;
    }

    if (!this.buyRounds(1)) {
      return;
    }

    this.startPaidRound();
  }

  increaseEntry(): void {
    if (this.isRoundLocked) {
      return;
    }

    this.entryValue = normalizeMineRushEntry(this.entryValue + this.entryStep);
  }

  decreaseEntry(): void {
    if (this.isRoundLocked) {
      return;
    }

    this.entryValue = normalizeMineRushEntry(this.entryValue - this.entryStep);
  }

  openRoundsModal(): void {
    if (this.isRoundLocked) {
      return;
    }

    this.isRoundsModalOpen = true;
  }

  closeRoundsModal(): void {
    if (this.isRoundLocked) {
      return;
    }

    this.isRoundsModalOpen = false;
  }

  openInfoModal(): void {
    this.isInfoModalOpen = true;
  }

  closeInfoModal(): void {
    this.isInfoModalOpen = false;
  }

  toggleDoubleLuck(): void {
    if (this.isRoundLocked) {
      return;
    }

    this.isDoubleLuckEnabled = !this.isDoubleLuckEnabled;
  }

  increaseSequenceRounds(): void {
    this.sequenceRoundCount = Math.min(
      MAX_SEQUENCE_ROUNDS,
      this.sequenceRoundCount + 1
    );
  }

  decreaseSequenceRounds(): void {
    this.sequenceRoundCount = Math.max(
      MIN_SEQUENCE_ROUNDS,
      this.sequenceRoundCount - 1
    );
  }

  selectSequenceRoundCount(rounds: number): void {
    this.sequenceRoundCount = Math.max(
      MIN_SEQUENCE_ROUNDS,
      Math.min(MAX_SEQUENCE_ROUNDS, rounds)
    );
  }

  buySequenceRounds(): void {
    if (this.isRoundLocked) {
      return;
    }

    if (!this.buyRounds(this.sequenceRoundCount, this.sequenceCostMultiplier)) {
      return;
    }

    this.isRoundsModalOpen = false;
    this.sequenceTotalRounds = this.sequenceRoundCount;
    this.sequencePlayedRounds = 0;
    this.sequenceAccumulatedPayout = 0;
    this.sequenceTotalBetValue = this.sequenceTotalCost;
    this.sequenceResult = null;
    this.startPaidRound();
  }

  skipSequenceAnimations(): void {
    if (!this.canSkipSequenceAnimations) {
      return;
    }

    this.clearSpinTimers();
    this.clearNextSequenceRoundTimer();

    if (this.isSpinning) {
      this.sequencePlayedRounds = Math.max(0, this.sequencePlayedRounds - 1);
    }

    this.isSpinning = false;

    while (this.sequencePlayedRounds < this.sequenceTotalRounds) {
      this.resolveInstantSequenceRound();
    }

    this.scheduleNextSequenceRound();
  }

  isWinningCell(cell: MineRushCell): boolean {
    return this.winningCellKeys.has(this.getCellKey(cell));
  }

  formatEntry(value: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  formatScore(value: number): string {
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  trackCell(_index: number, cell: MineRushCell): string {
    return this.getCellKey(cell);
  }

  private get isRoundLocked(): boolean {
    return this.isSpinning || this.isCreditPending || this.isSequenceActive;
  }

  private get sequenceCostMultiplier(): number {
    return this.isDoubleLuckEnabled ? DOUBLE_LUCK_COST_MULTIPLIER : 1;
  }

  private get boardSequenceChanceMultiplier(): number {
    return this.isSequenceActive && this.isDoubleLuckEnabled
      ? DOUBLE_LUCK_CHANCE_MULTIPLIER
      : 1;
  }

  private buyRounds(rounds: number, costMultiplier = 1): boolean {
    if (!this.currentUser) {
      this.setFeedback('Entre na sua conta para jogar Mine Rush.', 'error');
      return false;
    }

    const totalCost = this.toCurrencyValue(
      this.entryValue * rounds * costMultiplier
    );

    if (totalCost > this.currentUser.balance) {
      this.setFeedback('Saldo insuficiente para comprar essas rodadas.', 'error');
      return false;
    }

    this.authService.updateBalance(
      this.toCurrencyValue(this.currentUser.balance - totalCost)
    );

    return true;
  }

  private startPaidRound(): void {
    this.clearNextSequenceRoundTimer();
    this.roundNumber++;
    this.sequencePlayedRounds += this.isSequenceActive ? 1 : 0;
    this.hasPlayed = true;
    this.isSpinning = true;
    this.feedback = null;
    this.pendingPayout = null;
    this.sequenceResult = null;
    this.currentRoundPayout = 0;
    this.score = this.createEmptyScore();
    this.winningCellKeys.clear();
    this.clearSpinTimers();
    this.startRowSpinTimers();

    this.spinTimeoutId = setTimeout(() => {
      this.finishSpin();
    }, SPIN_DURATION_MS);
  }

  private startRowSpinTimers(): void {
    this.rowSpinIntervalIds = ROW_SPIN_TICK_MS.map((intervalMs, rowIndex) =>
      setInterval(() => {
        this.spinVisualRow(rowIndex);
      }, intervalMs)
    );
  }

  private spinVisualRow(rowIndex: number): void {
    const nextBoard = createMineRushBoard(Math.random, {
      sequenceChanceMultiplier: this.boardSequenceChanceMultiplier,
    });

    this.board = this.board.map((row, index) =>
      index === rowIndex ? nextBoard[rowIndex] : row
    );
  }

  private finishSpin(): void {
    this.clearSpinTimers();
    this.board = createMineRushBoard(Math.random, {
      sequenceChanceMultiplier: this.boardSequenceChanceMultiplier,
    });
    this.score = calculateMineRushScore(this.board, this.entryValue);
    this.currentRoundPayout = limitMineRushPayoutToMaxWin(
      this.score.roundScore,
      this.entryValue
    );
    this.isSpinning = false;
    this.mapWinningCells();

    if (!this.score.hasWin) {
      if (!this.isSequenceActive) {
        this.setFeedback('Nenhum grupo conectado com cinco ou mais peças.', 'info');
      }

      this.scheduleNextSequenceRound();
      return;
    }

    if (this.isSequenceActive) {
      this.currentRoundPayout = calculateMineRushSequenceRoundScore(
        this.score,
        this.entryValue,
        this.sequenceAccumulatedPayout
      );
      this.currentRoundPayout = limitMineRushPayoutToMaxWin(
        this.currentRoundPayout,
        this.sequenceTotalBetValue,
        this.sequenceAccumulatedPayout
      );
      this.sequenceAccumulatedPayout = this.toCurrencyValue(
        this.sequenceAccumulatedPayout + this.currentRoundPayout
      );
      this.scheduleNextSequenceRound();
      return;
    }

    this.pendingPayout = {
      amount: this.currentRoundPayout,
    };
    this.isCreditPending = true;
    this.setFeedback('Ganho encontrado. Creditando no saldo...', 'success');
    this.creditTimeoutId = setTimeout(() => {
      this.creditPendingPayout();
    }, CREDIT_DELAY_MS);
  }

  private resolveInstantSequenceRound(): void {
    this.sequencePlayedRounds++;
    this.board = createMineRushBoard(Math.random, {
      sequenceChanceMultiplier: this.boardSequenceChanceMultiplier,
    });
    this.score = calculateMineRushScore(this.board, this.entryValue);
    this.currentRoundPayout = 0;

    if (!this.score.hasWin) {
      this.winningCellKeys.clear();
      return;
    }

    this.currentRoundPayout = calculateMineRushSequenceRoundScore(
      this.score,
      this.entryValue,
      this.sequenceAccumulatedPayout
    );
    this.currentRoundPayout = limitMineRushPayoutToMaxWin(
      this.currentRoundPayout,
      this.sequenceTotalBetValue,
      this.sequenceAccumulatedPayout
    );
    this.sequenceAccumulatedPayout = this.toCurrencyValue(
      this.sequenceAccumulatedPayout + this.currentRoundPayout
    );
    this.mapWinningCells();
  }

  private mapWinningCells(): void {
    this.winningCellKeys.clear();

    this.score.winningGroups.forEach((group) => {
      group.cells.forEach((cell) => {
        this.winningCellKeys.add(this.getCellKey(cell));
      });
    });
  }

  private clearSpinTimers(): void {
    this.rowSpinIntervalIds.forEach((intervalId) => clearInterval(intervalId));
    this.rowSpinIntervalIds = [];

    if (this.spinTimeoutId) {
      clearTimeout(this.spinTimeoutId);
      this.spinTimeoutId = null;
    }
  }

  private creditPendingPayout(): void {
    this.creditTimeoutId = null;
    const payout = this.pendingPayout;

    if (!payout) {
      this.isCreditPending = false;
      return;
    }

    if (!this.currentUser) {
      this.isCreditPending = false;
      this.sequenceTotalRounds = 0;
      this.sequencePlayedRounds = 0;
      this.setFeedback('Nao foi possivel creditar: usuario desconectado.', 'error');
      return;
    }

    this.authService.updateBalance(
      this.toCurrencyValue(this.currentUser.balance + payout.amount)
    );
    this.totalScore = this.toCurrencyValue(this.totalScore + payout.amount);
    this.isCreditPending = false;
    this.setFeedback('Ganho creditado no saldo.', 'success');
    this.scheduleNextSequenceRound();
  }

  private creditSequenceResult(): void {
    this.creditTimeoutId = null;

    if (!this.sequenceResult) {
      this.isCreditPending = false;
      return;
    }

    if (!this.currentUser) {
      this.isCreditPending = false;
      this.setFeedback('Nao foi possivel creditar: usuario desconectado.', 'error');
      return;
    }

    this.authService.updateBalance(
      this.toCurrencyValue(this.currentUser.balance + this.sequenceResult.amount)
    );
    this.totalScore = this.toCurrencyValue(
      this.totalScore + this.sequenceResult.amount
    );
    this.isCreditPending = false;
    this.setFeedback('Ganho da sequência creditado no saldo.', 'success');
  }

  private clearCreditTimer(): void {
    if (!this.creditTimeoutId) {
      return;
    }

    clearTimeout(this.creditTimeoutId);
    this.creditTimeoutId = null;
  }

  private scheduleNextSequenceRound(): void {
    if (!this.isSequenceActive) {
      return;
    }

    if (this.sequencePlayedRounds >= this.sequenceTotalRounds) {
      const finishedRounds = this.sequenceTotalRounds;
      const finalPayout = this.sequenceAccumulatedPayout;
      this.sequenceTotalRounds = 0;
      this.sequencePlayedRounds = 0;
      this.sequenceAccumulatedPayout = 0;
      this.sequenceTotalBetValue = 0;
      this.sequenceResult = {
        amount: finalPayout,
        rounds: finishedRounds,
      };

      if (finalPayout <= 0) {
        this.setFeedback('Sequência finalizada sem ganho.', 'info');
        return;
      }

      this.isCreditPending = true;
      this.setFeedback('Sequência finalizada. Creditando total...', 'success');
      this.creditTimeoutId = setTimeout(() => {
        this.creditSequenceResult();
      }, CREDIT_DELAY_MS);
      return;
    }

    this.nextSequenceRoundTimeoutId = setTimeout(() => {
      this.startPaidRound();
    }, NEXT_SEQUENCE_ROUND_DELAY_MS);
  }

  private clearNextSequenceRoundTimer(): void {
    if (!this.nextSequenceRoundTimeoutId) {
      return;
    }

    clearTimeout(this.nextSequenceRoundTimeoutId);
    this.nextSequenceRoundTimeoutId = null;
  }

  private setFeedback(
    message: string,
    type: MineRushFeedbackType
  ): void {
    this.feedback = {
      message,
      type,
    };
    this.clearToastTimer();
    this.toastTimeoutId = setTimeout(() => {
      this.feedback = null;
      this.toastTimeoutId = null;
    }, TOAST_DURATION_MS);
  }

  private clearToastTimer(): void {
    if (!this.toastTimeoutId) {
      return;
    }

    clearTimeout(this.toastTimeoutId);
    this.toastTimeoutId = null;
  }

  private getCellKey(cell: MineRushCell): string {
    return `${cell.row}-${cell.column}`;
  }

  private createEmptyScore(): MineRushScore {
    return {
      winningGroups: [],
      roundScore: 0,
      totalMultiplier: 0,
      hasWin: false,
    };
  }

  private toCurrencyValue(value: number): number {
    return Math.round(value * 100) / 100;
  }
}

function createMineRushInfoRow(symbol: MineRushSymbol): MineRushInfoRow {
  const isLowReturn = MINE_RUSH_LOW_RETURN_GROUP_SYMBOL_IDS.includes(symbol.id);
  const baseReturnPercent = symbol.multiplier * 100;

  return {
    id: symbol.id,
    label: symbol.label,
    asset: symbol.asset,
    returnText: isLowReturn
      ? `${formatMineRushPercent(baseReturnPercent)} até ${MINE_RUSH_LOW_RETURN_MAX_PERCENT}%`
      : `${formatMineRushPercent(baseReturnPercent)}+`,
    sequenceChanceText: formatMineRushPercent(
      getMineRushSequenceChancePercent(symbol)
    ),
  };
}

function formatMineRushPercent(value: number): string {
  return `${value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: value < 10 ? 1 : 0,
  })}%`;
}
