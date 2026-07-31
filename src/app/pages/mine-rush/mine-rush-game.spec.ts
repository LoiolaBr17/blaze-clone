import {
  MINE_RUSH_COLUMNS,
  MINE_RUSH_MIN_ENTRY,
  MINE_RUSH_ROWS,
  MineRushCell,
  MineRushSymbolId,
  calculateMineRushScore,
  calculateMineRushSequenceRoundScore,
  createMineRushBoard,
  getMineRushSymbol,
  limitMineRushPayoutToMaxWin,
  normalizeMineRushEntry,
} from './mine-rush-game';

describe('Mine Rush game logic', () => {
  it('scores connected groups in diagonal and irregular paths', () => {
    const board = createBoard([
      ['amethyst', 'pickaxe', 'shovel', 'helmet', 'sapphire', 'emerald'],
      ['ruby', 'amethyst', 'diamond', 'pickaxe', 'shovel', 'helmet'],
      ['sapphire', 'emerald', 'amethyst', 'amethyst', 'ruby', 'diamond'],
      ['pickaxe', 'shovel', 'helmet', 'sapphire', 'amethyst', 'ruby'],
      ['emerald', 'ruby', 'diamond', 'pickaxe', 'shovel', 'helmet'],
    ]);

    const score = calculateMineRushScore(board, 0.25);

    expect(score.hasWin).toBeTrue();
    expect(score.winningGroups.length).toBe(1);
    expect(score.winningGroups[0].symbol.id).toBe('amethyst');
    expect(score.winningGroups[0].size).toBe(5);
    expect(score.winningGroups[0].multiplier).toBe(0.5);
    expect(score.winningGroups[0].score).toBe(0.13);
  });

  it('does not score groups with fewer than five connected symbols', () => {
    const board = createBoard([
      ['diamond', 'pickaxe', 'shovel', 'helmet', 'sapphire', 'emerald'],
      ['ruby', 'diamond', 'amethyst', 'pickaxe', 'shovel', 'helmet'],
      ['sapphire', 'emerald', 'diamond', 'amethyst', 'ruby', 'pickaxe'],
      ['pickaxe', 'shovel', 'helmet', 'sapphire', 'diamond', 'ruby'],
      ['emerald', 'ruby', 'amethyst', 'pickaxe', 'shovel', 'helmet'],
    ]);

    const score = calculateMineRushScore(board, 1);

    expect(score.hasWin).toBeFalse();
    expect(score.winningGroups).toEqual([]);
    expect(score.roundScore).toBe(0);
  });

  it('adds multiple winning groups with each symbol multiplier weight', () => {
    const board = createBoard([
      ['ruby', 'ruby', 'ruby', 'helmet', 'sapphire', 'emerald'],
      ['ruby', 'ruby', 'diamond', 'pickaxe', 'shovel', 'helmet'],
      ['sapphire', 'emerald', 'diamond', 'diamond', 'ruby', 'pickaxe'],
      ['pickaxe', 'shovel', 'helmet', 'sapphire', 'diamond', 'ruby'],
      ['emerald', 'ruby', 'amethyst', 'pickaxe', 'shovel', 'diamond'],
    ]);

    const score = calculateMineRushScore(board, 2);

    expect(score.winningGroups.length).toBe(2);
    expect(score.winningGroups[0].symbol.id).toBe('diamond');
    expect(score.winningGroups[0].size).toBe(5);
    expect(score.winningGroups[0].score).toBe(24);
    expect(score.winningGroups[1].symbol.id).toBe('ruby');
    expect(score.winningGroups[1].size).toBe(5);
    expect(score.winningGroups[1].score).toBe(10);
    expect(score.roundScore).toBe(34);
  });

  it('caps low-return symbols at 35% of the entry value', () => {
    const board = createBoard([
      ['helmet', 'helmet', 'helmet', 'helmet', 'helmet', 'helmet'],
      ['helmet', 'helmet', 'helmet', 'helmet', 'helmet', 'helmet'],
      ['helmet', 'helmet', 'helmet', 'helmet', 'helmet', 'helmet'],
      ['helmet', 'helmet', 'helmet', 'helmet', 'helmet', 'helmet'],
      ['helmet', 'helmet', 'helmet', 'helmet', 'helmet', 'helmet'],
    ]);

    const score = calculateMineRushScore(board, 10);

    expect(score.winningGroups[0].multiplier).toBe(0.35);
    expect(score.roundScore).toBe(3.5);
  });

  it('increases payout by group size while keeping symbol value weight', () => {
    const smallPickaxeScore = calculateMineRushScore(
      createSingleGroupBoard('pickaxe'),
      1
    );
    const largePickaxeScore = calculateMineRushScore(
      createFilledBoard('pickaxe'),
      1
    );
    const smallRubyScore = calculateMineRushScore(
      createSingleGroupBoard('ruby'),
      1
    );
    const largeRubyScore = calculateMineRushScore(createFilledBoard('ruby'), 1);
    const smallPickaxeGroup = getWinningGroup(smallPickaxeScore, 'pickaxe');
    const largePickaxeGroup = getWinningGroup(largePickaxeScore, 'pickaxe');
    const smallRubyGroup = getWinningGroup(smallRubyScore, 'ruby');
    const largeRubyGroup = getWinningGroup(largeRubyScore, 'ruby');

    expect(largePickaxeGroup.score).toBeGreaterThan(smallPickaxeGroup.score);
    expect(largeRubyGroup.score).toBeGreaterThan(smallRubyGroup.score);
    expect(smallRubyGroup.score).toBeGreaterThan(largePickaxeGroup.score);
  });

  it('compounds gem percentage payouts over sequence winnings with damping', () => {
    const score = calculateMineRushScore(createSingleGroupBoard('amethyst'), 1);

    expect(calculateMineRushSequenceRoundScore(score, 1, 0)).toBe(0.5);
    expect(calculateMineRushSequenceRoundScore(score, 1, 10)).toBe(0.57);
  });

  it('keeps simple sequence payouts based only on the round entry', () => {
    const score = calculateMineRushScore(createSingleGroupBoard('pickaxe'), 1);

    expect(calculateMineRushSequenceRoundScore(score, 1, 0)).toBe(0.05);
    expect(calculateMineRushSequenceRoundScore(score, 1, 10)).toBe(0.05);
  });

  it('limits payouts to 100x the total bet value', () => {
    expect(limitMineRushPayoutToMaxWin(150, 1)).toBe(100);
    expect(limitMineRushPayoutToMaxWin(20, 1, 95)).toBe(5);
    expect(limitMineRushPayoutToMaxWin(20, 1, 100)).toBe(0);
  });

  it('normalizes entry values to 0.25 steps', () => {
    expect(normalizeMineRushEntry(0)).toBe(MINE_RUSH_MIN_ENTRY);
    expect(normalizeMineRushEntry(0.51)).toBe(0.5);
    expect(normalizeMineRushEntry(1.13)).toBe(1.25);
    expect(normalizeMineRushEntry(125)).toBe(100);
  });

  it('prefers a lower-risk symbol when a repeated neighbor is avoidable', () => {
    const board = createMineRushBoard(createRandomSequence([0, 0, 0.99]));

    expect(board[0][0].symbol.id).toBe('pickaxe');
    expect(board[0][1].symbol.id).toBe('dynamite');
  });

  it('can plant a recurring low-return connected group', () => {
    const board = createMineRushBoard(
      createRandomSequence([...Array(70).fill(0.5), 0, 0, 0, 0, 0])
    );
    const score = calculateMineRushScore(board, 1);

    expect(
      score.winningGroups.some((group) =>
        ['pickaxe', 'shovel', 'helmet', 'dynamite'].includes(group.symbol.id)
      )
    ).toBeTrue();
  });

  it('applies doubled sequence chance for boosted multiple rounds', () => {
    const randomValues = [
      ...Array(88).fill(0.99),
      0.99,
      ...Array(36).fill(0.03),
    ];
    const regularBoard = createMineRushBoard(createRandomSequence(randomValues));
    const boostedBoard = createMineRushBoard(createRandomSequence(randomValues), {
      sequenceChanceMultiplier: 2,
    });

    expect(hasWinningSymbol(regularBoard, 'sapphire')).toBeFalse();
    expect(hasWinningSymbol(boostedBoard, 'sapphire')).toBeTrue();
  });

  it('prioritizes higher-value sequence groups when multiple chances hit', () => {
    const board = createMineRushBoard(
      createRandomSequence([
        ...Array(88).fill(0.99),
        0.99,
        0,
        0,
        0,
        0,
        0.99,
        0.99,
        0.99,
        0.99,
        0.99,
        0.99,
        0.99,
        0,
        0,
        0,
        0,
      ])
    );

    expect(board[0].slice(0, 5).every((cell) => cell.symbol.id === 'diamond'))
      .toBeTrue();
  });
});

function createBoard(symbolRows: MineRushSymbolId[][]): MineRushCell[][] {
  expect(symbolRows.length).toBe(MINE_RUSH_ROWS);
  symbolRows.forEach((row) => expect(row.length).toBe(MINE_RUSH_COLUMNS));

  return symbolRows.map((row, rowIndex) =>
    row.map((symbolId, columnIndex) => ({
      row: rowIndex,
      column: columnIndex,
      symbol: getMineRushSymbol(symbolId),
    }))
  );
}

function createSingleGroupBoard(symbolId: MineRushSymbolId): MineRushCell[][] {
  const replacementSymbolId: MineRushSymbolId =
    symbolId === 'shovel' ? 'helmet' : 'shovel';

  return createBoard([
    ['amethyst', 'pickaxe', 'shovel', 'helmet', 'sapphire', 'emerald'],
    ['ruby', 'amethyst', 'diamond', 'pickaxe', 'shovel', 'helmet'],
    ['sapphire', 'emerald', 'amethyst', 'amethyst', 'ruby', 'diamond'],
    ['pickaxe', 'shovel', 'helmet', 'sapphire', 'amethyst', 'ruby'],
    ['emerald', 'ruby', 'diamond', 'pickaxe', 'shovel', 'helmet'],
  ]).map((row) =>
    row.map((cell) => ({
      ...cell,
      symbol: getMineRushSymbol(
        cell.symbol.id === 'amethyst'
          ? symbolId
          : cell.symbol.id === symbolId
            ? replacementSymbolId
            : cell.symbol.id
      ),
    }))
  );
}

function createFilledBoard(symbolId: MineRushSymbolId): MineRushCell[][] {
  return createBoard(
    Array.from({ length: MINE_RUSH_ROWS }, () =>
      Array.from({ length: MINE_RUSH_COLUMNS }, () => symbolId)
    )
  );
}

function getWinningGroup(
  score: ReturnType<typeof calculateMineRushScore>,
  symbolId: MineRushSymbolId
) {
  const group = score.winningGroups.find((item) => item.symbol.id === symbolId);

  expect(group).toBeDefined();

  return group!;
}

function hasWinningSymbol(
  board: MineRushCell[][],
  symbolId: MineRushSymbolId
): boolean {
  return calculateMineRushScore(board, 1).winningGroups.some(
    (group) => group.symbol.id === symbolId
  );
}

function createRandomSequence(values: number[]): () => number {
  let index = 0;

  return () => values[index++] ?? 0.99;
}
