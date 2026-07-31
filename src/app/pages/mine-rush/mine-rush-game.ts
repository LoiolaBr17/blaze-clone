export type MineRushSymbolId =
  | 'pickaxe'
  | 'shovel'
  | 'helmet'
  | 'amethyst'
  | 'sapphire'
  | 'emerald'
  | 'ruby'
  | 'diamond'
  | 'dynamite';

export type MineRushSymbolCategory =
  | 'Comum'
  | 'Incomum'
  | 'Rara'
  | 'Muito raro'
  | 'Especial';

export interface MineRushSymbol {
  id: MineRushSymbolId;
  label: string;
  category: MineRushSymbolCategory;
  frequency: number;
  multiplier: number;
  asset: string;
}

export interface MineRushCell {
  symbol: MineRushSymbol;
  row: number;
  column: number;
}

export interface MineRushConnectedGroup {
  symbol: MineRushSymbol;
  cells: MineRushCell[];
  size: number;
  multiplier: number;
  score: number;
}

export interface MineRushScore {
  winningGroups: MineRushConnectedGroup[];
  roundScore: number;
  totalMultiplier: number;
  hasWin: boolean;
}

export interface MineRushBoardOptions {
  sequenceChanceMultiplier?: number;
}

export const MINE_RUSH_COLUMNS = 6;
export const MINE_RUSH_ROWS = 5;
export const MINE_RUSH_MIN_GROUP_SIZE = 5;
export const MINE_RUSH_ENTRY_STEP = 0.25;
export const MINE_RUSH_MIN_ENTRY = 0.25;
export const MINE_RUSH_MAX_ENTRY = 100;
export const MINE_RUSH_MAX_WIN_MULTIPLIER = 100;
const MINE_RUSH_BALANCE_ATTEMPTS = 2;
const MINE_RUSH_LOW_RETURN_MAX_MULTIPLIER = 0.35;
const MINE_RUSH_GROUP_BASE_GROWTH = 0.12;
const MINE_RUSH_GROUP_ACCELERATED_GROWTH = 0.0012;
const MINE_RUSH_SEQUENCE_GEM_COMPOUND_SHARE = 0.015;
export const MINE_RUSH_LOW_RETURN_GROUP_CHANCE = 0.18;
export const MINE_RUSH_LOW_RETURN_MAX_PERCENT = 35;
export const MINE_RUSH_LOW_RETURN_GROUP_SYMBOL_IDS: MineRushSymbolId[] = [
  'pickaxe',
  'shovel',
  'helmet',
  'dynamite',
];
export const MINE_RUSH_GEM_SYMBOL_IDS: MineRushSymbolId[] = [
  'amethyst',
  'sapphire',
  'emerald',
  'ruby',
  'diamond',
];
export const MINE_RUSH_SEQUENCE_CHANCE_BY_SYMBOL: Record<
  MineRushSymbolId,
  number
> = {
  pickaxe: 16,
  shovel: 12,
  helmet: 9,
  amethyst: 4,
  sapphire: 2,
  emerald: 0.8,
  ruby: 0.3,
  diamond: 0.06,
  dynamite: 5,
};
const MINE_RUSH_LOW_RETURN_SYMBOLS = new Set<MineRushSymbolId>(
  MINE_RUSH_LOW_RETURN_GROUP_SYMBOL_IDS
);
const MINE_RUSH_GROUP_SHAPES: ReadonlyArray<ReadonlyArray<[number, number]>> = [
  [
    [0, 0],
    [0, 1],
    [0, 2],
    [0, 3],
    [0, 4],
  ],
  [
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 0],
    [4, 0],
  ],
  [
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [4, 4],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
    [2, 2],
  ],
  [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 2],
  ],
];

export const MINE_RUSH_SYMBOLS: MineRushSymbol[] = [
  {
    id: 'pickaxe',
    label: 'Picareta',
    category: 'Comum',
    frequency: 24,
    multiplier: 0.05,
    asset: 'assets/images/mine/picareta.png',
  },
  {
    id: 'shovel',
    label: 'Pá',
    category: 'Comum',
    frequency: 22,
    multiplier: 0.06,
    asset: 'assets/images/mine/pa\u0301.png',
  },
  {
    id: 'helmet',
    label: 'Capacete',
    category: 'Comum',
    frequency: 20,
    multiplier: 0.08,
    asset: 'assets/images/mine/capacete.png',
  },
  {
    id: 'amethyst',
    label: 'Ametista',
    category: 'Incomum',
    frequency: 12,
    multiplier: 0.5,
    asset: 'assets/images/mine/ametista.png',
  },
  {
    id: 'sapphire',
    label: 'Safira',
    category: 'Incomum',
    frequency: 9,
    multiplier: 0.9,
    asset: 'assets/images/mine/safira.png',
  },
  {
    id: 'emerald',
    label: 'Esmeralda',
    category: 'Rara',
    frequency: 6,
    multiplier: 2,
    asset: 'assets/images/mine/esmeralda.png',
  },
  {
    id: 'ruby',
    label: 'Rubi',
    category: 'Rara',
    frequency: 4,
    multiplier: 5,
    asset: 'assets/images/mine/rubi.png',
  },
  {
    id: 'diamond',
    label: 'Diamante',
    category: 'Muito raro',
    frequency: 2,
    multiplier: 12,
    asset: 'assets/images/mine/diamante.png',
  },
  {
    id: 'dynamite',
    label: 'Dinamite',
    category: 'Especial',
    frequency: 5,
    multiplier: 0.1,
    asset: 'assets/images/mine/tnt.png',
  },
];

export function getMineRushSymbol(id: MineRushSymbolId): MineRushSymbol {
  const symbol = MINE_RUSH_SYMBOLS.find((item) => item.id === id);

  if (!symbol) {
    throw new Error(`Simbolo do Mine Rush nao encontrado: ${id}`);
  }

  return symbol;
}

export function createMineRushBoard(
  random: () => number = Math.random,
  options: MineRushBoardOptions = {}
): MineRushCell[][] {
  const board: MineRushCell[][] = Array.from(
    { length: MINE_RUSH_ROWS },
    () => []
  );

  for (let row = 0; row < MINE_RUSH_ROWS; row++) {
    for (let column = 0; column < MINE_RUSH_COLUMNS; column++) {
      board[row][column] = {
        row,
        column,
        symbol: getBalancedMineRushSymbol(board, row, column, random),
      };
    }
  }

  maybePlantLowReturnGroup(board, random);
  maybePlantConfiguredSequenceGroups(
    board,
    random,
    options.sequenceChanceMultiplier ?? 1
  );

  return board;
}

export function getMineRushSequenceChancePercent(
  symbol: MineRushSymbol
): number {
  return MINE_RUSH_SEQUENCE_CHANCE_BY_SYMBOL[symbol.id];
}

export function calculateMineRushSequenceRoundScore(
  score: MineRushScore,
  entryValue: number,
  accumulatedPayout: number
): number {
  return toGameNumber(
    score.winningGroups.reduce((total, group) => {
      if (MINE_RUSH_GEM_SYMBOL_IDS.includes(group.symbol.id)) {
        return (
          total +
          group.score +
          accumulatedPayout *
            group.multiplier *
            MINE_RUSH_SEQUENCE_GEM_COMPOUND_SHARE
        );
      }

      return total + group.score;
    }, 0)
  );
}

export function limitMineRushPayoutToMaxWin(
  payout: number,
  totalBetValue: number,
  accumulatedPayout = 0
): number {
  const maxPayout = toGameNumber(totalBetValue * MINE_RUSH_MAX_WIN_MULTIPLIER);
  const remainingPayout = Math.max(0, maxPayout - accumulatedPayout);

  return toGameNumber(Math.min(payout, remainingPayout));
}

export function calculateMineRushScore(
  board: MineRushCell[][],
  entryValue: number
): MineRushScore {
  const winningGroups = findMineRushConnectedGroups(board)
    .filter((group) => group.size >= MINE_RUSH_MIN_GROUP_SIZE)
    .map((group) => {
      const multiplier = calculateGroupMultiplier(group);

      return {
        ...group,
        multiplier,
        score: toGameNumber(entryValue * multiplier),
      };
    })
    .sort((left, right) => right.score - left.score);
  const roundScore = toGameNumber(
    winningGroups.reduce((total, group) => total + group.score, 0)
  );
  const totalMultiplier = toGameNumber(
    winningGroups.reduce((total, group) => total + group.multiplier, 0)
  );

  return {
    winningGroups,
    roundScore,
    totalMultiplier,
    hasWin: winningGroups.length > 0,
  };
}

function calculateGroupMultiplier(group: MineRushConnectedGroup): number {
  const multiplier = group.symbol.multiplier * calculateGroupSizeWeight(group);

  if (MINE_RUSH_LOW_RETURN_SYMBOLS.has(group.symbol.id)) {
    return toGameNumber(
      Math.min(MINE_RUSH_LOW_RETURN_MAX_MULTIPLIER, multiplier)
    );
  }

  return toGameNumber(multiplier);
}

function calculateGroupSizeWeight(group: MineRushConnectedGroup): number {
  const extraItems = Math.max(0, group.size - MINE_RUSH_MIN_GROUP_SIZE);

  return (
    1 +
    extraItems * MINE_RUSH_GROUP_BASE_GROWTH +
    extraItems * extraItems * MINE_RUSH_GROUP_ACCELERATED_GROWTH
  );
}

export function normalizeMineRushEntry(value: number): number {
  const steppedValue =
    Math.round(value / MINE_RUSH_ENTRY_STEP) * MINE_RUSH_ENTRY_STEP;
  const clampedValue = Math.max(
    MINE_RUSH_MIN_ENTRY,
    Math.min(MINE_RUSH_MAX_ENTRY, steppedValue)
  );

  return toGameNumber(clampedValue);
}

function findMineRushConnectedGroups(
  board: MineRushCell[][]
): MineRushConnectedGroup[] {
  const visited = new Set<string>();
  const groups: MineRushConnectedGroup[] = [];

  for (const row of board) {
    for (const cell of row) {
      const cellKey = getCellKey(cell);

      if (visited.has(cellKey)) {
        continue;
      }

      const cells = collectConnectedCells(board, cell, visited);

      groups.push({
        symbol: cell.symbol,
        cells,
        size: cells.length,
        multiplier: 0,
        score: 0,
      });
    }
  }

  return groups;
}

function collectConnectedCells(
  board: MineRushCell[][],
  firstCell: MineRushCell,
  visited: Set<string>
): MineRushCell[] {
  const stack = [firstCell];
  const cells: MineRushCell[] = [];
  visited.add(getCellKey(firstCell));

  while (stack.length > 0) {
    const currentCell = stack.pop();

    if (!currentCell) {
      continue;
    }

    cells.push(currentCell);

    for (const neighbor of getEqualNeighbors(board, currentCell)) {
      const neighborKey = getCellKey(neighbor);

      if (visited.has(neighborKey)) {
        continue;
      }

      visited.add(neighborKey);
      stack.push(neighbor);
    }
  }

  return cells;
}

function getEqualNeighbors(
  board: MineRushCell[][],
  cell: MineRushCell
): MineRushCell[] {
  const neighbors: MineRushCell[] = [];

  for (let rowDelta = -1; rowDelta <= 1; rowDelta++) {
    for (let columnDelta = -1; columnDelta <= 1; columnDelta++) {
      if (rowDelta === 0 && columnDelta === 0) {
        continue;
      }

      const row = cell.row + rowDelta;
      const column = cell.column + columnDelta;
      const neighbor = board[row]?.[column];

      if (neighbor?.symbol.id === cell.symbol.id) {
        neighbors.push(neighbor);
      }
    }
  }

  return neighbors;
}

function getWeightedMineRushSymbol(random: () => number): MineRushSymbol {
  const totalFrequency = MINE_RUSH_SYMBOLS.reduce(
    (total, symbol) => total + symbol.frequency,
    0
  );
  const roll = random() * totalFrequency;
  let cumulativeFrequency = 0;

  for (const symbol of MINE_RUSH_SYMBOLS) {
    cumulativeFrequency += symbol.frequency;

    if (roll < cumulativeFrequency) {
      return symbol;
    }
  }

  return MINE_RUSH_SYMBOLS[MINE_RUSH_SYMBOLS.length - 1];
}

function getBalancedMineRushSymbol(
  board: MineRushCell[][],
  row: number,
  column: number,
  random: () => number
): MineRushSymbol {
  let selectedSymbol = getWeightedMineRushSymbol(random);
  let selectedPenalty = getPlacementPenalty(
    board,
    row,
    column,
    selectedSymbol.id
  );

  for (let attempt = 0; attempt < MINE_RUSH_BALANCE_ATTEMPTS; attempt++) {
    if (selectedPenalty === 0) {
      break;
    }

    const candidateSymbol = getWeightedMineRushSymbol(random);
    const candidatePenalty = getPlacementPenalty(
      board,
      row,
      column,
      candidateSymbol.id
    );

    if (candidatePenalty < selectedPenalty) {
      selectedSymbol = candidateSymbol;
      selectedPenalty = candidatePenalty;
    }
  }

  return selectedSymbol;
}

function maybePlantLowReturnGroup(
  board: MineRushCell[][],
  random: () => number
): void {
  if (random() >= MINE_RUSH_LOW_RETURN_GROUP_CHANCE) {
    return;
  }

  const symbol = getMineRushSymbol(
    MINE_RUSH_LOW_RETURN_GROUP_SYMBOL_IDS[
      Math.floor(random() * MINE_RUSH_LOW_RETURN_GROUP_SYMBOL_IDS.length)
    ]
  );
  plantSymbolGroup(board, symbol, random);
}

function maybePlantConfiguredSequenceGroups(
  board: MineRushCell[][],
  random: () => number,
  chanceMultiplier: number
): void {
  const symbolsByValue = [...MINE_RUSH_SYMBOLS].sort(
    (left, right) => right.multiplier - left.multiplier
  );

  const selectedSymbol = symbolsByValue.find((symbol) => {
    const chance = Math.min(
      100,
      getMineRushSequenceChancePercent(symbol) * chanceMultiplier
    );

    return random() * 100 < chance;
  });

  if (selectedSymbol) {
    plantSymbolGroup(board, selectedSymbol, random);
  }
}

function plantSymbolGroup(
  board: MineRushCell[][],
  symbol: MineRushSymbol,
  random: () => number
): void {
  const shape =
    MINE_RUSH_GROUP_SHAPES[Math.floor(random() * MINE_RUSH_GROUP_SHAPES.length)];
  const maxRow =
    MINE_RUSH_ROWS - 1 - Math.max(...shape.map(([row]) => row));
  const maxColumn =
    MINE_RUSH_COLUMNS - 1 - Math.max(...shape.map(([, column]) => column));
  const startRow = Math.floor(random() * (maxRow + 1));
  const startColumn = Math.floor(random() * (maxColumn + 1));

  shape.forEach(([rowOffset, columnOffset]) => {
    const row = startRow + rowOffset;
    const column = startColumn + columnOffset;
    board[row][column] = {
      ...board[row][column],
      symbol,
    };
  });
}

function getPlacementPenalty(
  board: MineRushCell[][],
  row: number,
  column: number,
  symbolId: MineRushSymbolId
): number {
  const matchingNeighbors = getPlacedEqualNeighbors(board, row, column, symbolId);

  if (matchingNeighbors.length === 0) {
    return 0;
  }

  const connectedKeys = new Set<string>();

  matchingNeighbors.forEach((neighbor) =>
    collectPlacedGroupKeys(board, neighbor, symbolId, connectedKeys)
  );

  const projectedGroupSize = connectedKeys.size + 1;

  return matchingNeighbors.length * 3 + projectedGroupSize * projectedGroupSize;
}

function getPlacedEqualNeighbors(
  board: MineRushCell[][],
  row: number,
  column: number,
  symbolId: MineRushSymbolId
): MineRushCell[] {
  const previousNeighborPositions = [
    [row - 1, column - 1],
    [row - 1, column],
    [row - 1, column + 1],
    [row, column - 1],
  ];

  return previousNeighborPositions
    .map(([neighborRow, neighborColumn]) => board[neighborRow]?.[neighborColumn])
    .filter(
      (cell): cell is MineRushCell => cell?.symbol.id === symbolId
    );
}

function collectPlacedGroupKeys(
  board: MineRushCell[][],
  firstCell: MineRushCell,
  symbolId: MineRushSymbolId,
  groupKeys: Set<string>
): void {
  const stack = [firstCell];

  while (stack.length > 0) {
    const cell = stack.pop();

    if (!cell) {
      continue;
    }

    const key = getCellKey(cell);

    if (groupKeys.has(key)) {
      continue;
    }

    groupKeys.add(key);

    getPlacedNeighbors(board, cell)
      .filter((neighbor) => neighbor.symbol.id === symbolId)
      .forEach((neighbor) => stack.push(neighbor));
  }
}

function getPlacedNeighbors(
  board: MineRushCell[][],
  cell: MineRushCell
): MineRushCell[] {
  const neighbors: MineRushCell[] = [];

  for (let rowDelta = -1; rowDelta <= 1; rowDelta++) {
    for (let columnDelta = -1; columnDelta <= 1; columnDelta++) {
      if (rowDelta === 0 && columnDelta === 0) {
        continue;
      }

      const neighbor = board[cell.row + rowDelta]?.[cell.column + columnDelta];

      if (neighbor) {
        neighbors.push(neighbor);
      }
    }
  }

  return neighbors;
}

function getCellKey(cell: MineRushCell): string {
  return `${cell.row}-${cell.column}`;
}

function toGameNumber(value: number): number {
  return Math.round(value * 100) / 100;
}
