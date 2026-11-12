import type { Cell, PieceId, WinLine } from "./types";

export const BOARD_SIZE: number = 4;
export const CELL_COUNT: number = BOARD_SIZE ** 2;
export const TRAIT_MASK: number = 0b1111;

export const BOARD_WIN_LINES: readonly WinLine[] = [
  [0, 1, 2, 3],
  [4, 5, 6, 7],
  [8, 9, 10, 11],
  [12, 13, 14, 15],
  [0, 4, 8, 12],
  [1, 5, 9, 13],
  [2, 6, 10, 14],
  [3, 7, 11, 15],
  [0, 5, 10, 15],
  [3, 6, 9, 12],
];

const LINES_BY_CELL: readonly (readonly WinLine[])[] = Array.from(
  { length: CELL_COUNT },
  (_: unknown, cell: number): WinLine[] =>
    BOARD_WIN_LINES.filter((line: WinLine): boolean => line.includes(cell)),
);

function isPiece(bitVal: Cell | undefined): bitVal is PieceId {
  return bitVal !== null && bitVal !== undefined;
}

function bitCount(bitVal: number): number {
  let numBits: number = 0;
  while (bitVal !== 0) {
    bitVal &= bitVal - 1;
    numBits += 1;
  }
  return numBits;
}

export function getTraitMask(
  brd: readonly Cell[],
  line: WinLine,
  placedCell = -1,
  placedPiece?: PieceId,
): number {
  let isWinOnes: number = TRAIT_MASK;
  let isWinZeros: number = TRAIT_MASK;
  for (const cell of line) {
    const pc: Cell | undefined = cell === placedCell ? placedPiece : brd[cell];

    if (!isPiece(pc)) return 0;
    isWinOnes &= pc;
    isWinZeros &= ~pc;
  }
  return (isWinOnes | isWinZeros) & TRAIT_MASK;
}

function isWinLine(
  brd: readonly Cell[],
  line: WinLine,
  placedCell = -1,
  placedPiece?: PieceId,
): boolean {
  return getTraitMask(brd, line, placedCell, placedPiece) !== 0;
}

export function getWinLine(brd: readonly Cell[]): WinLine | null {
  for (const line of BOARD_WIN_LINES) {
    if (isWinLine(brd, line)) return line;
  }
  return null;
}

export function getWinLines(brd: readonly Cell[]): WinLine[] {
  return BOARD_WIN_LINES.filter((line: WinLine): boolean => isWinLine(brd, line));
}

export function isWinCellPlacement(brd: readonly Cell[], cell: number, pc: PieceId): boolean {
  if (!isValidCell(brd, cell)) {
    return false;
  }
  return (
    LINES_BY_CELL[cell]?.some((line: WinLine): boolean => isWinLine(brd, line, cell, pc)) ?? false
  );
}

export function isValidCell(brd: readonly Cell[], cell: number): boolean {
  return Number.isInteger(cell) && cell >= 0 && cell < brd.length && brd[cell] === null;
}

export function sumWinCells(brd: readonly Cell[], pc: PieceId): number {
  let sum: number = 0;
  for (let cell: number = 0; cell < brd.length; cell += 1) {
    if (brd[cell] === null && isWinCellPlacement(brd, cell, pc)) {
      sum += 1;
    }
  }
  return sum;
}

export function getEmptyCells(brd: readonly Cell[]): number[] {
  const cells: number[] = [];
  for (let cell: number = 0; cell < brd.length; cell += 1) {
    if (brd[cell] === null) cells.push(cell);
  }
  return cells;
}

export function isBoardEmpty(brd: readonly Cell[]): boolean {
  return brd.length === CELL_COUNT && brd.every((cell: Cell): cell is null => cell === null);
}

export function isBoardFull(brd: readonly Cell[]): boolean {
  return brd.length === CELL_COUNT && brd.every((cell: Cell): cell is PieceId => cell !== null);
}

export function cellPlacementScore(brd: readonly Cell[], cell: number, pc: PieceId): number {
  let score: number = 0;

  for (const line of LINES_BY_CELL[cell] ?? []) {
    let pieceCount: number = 1;
    let ones: number = pc;
    let zeroes: number = ~pc & TRAIT_MASK;

    for (const lineCell of line) {
      if (lineCell === cell) continue;

      const bitVal: Cell | undefined = brd[lineCell];
      if (!isPiece(bitVal)) continue;

      pieceCount += 1;
      ones &= bitVal;
      zeroes &= ~bitVal;
    }
    if (pieceCount < 2) continue;
    const commonTraitCount: number = (ones | zeroes) & TRAIT_MASK;
    score += bitCount(commonTraitCount) * pieceCount ** 2;
  }
  return score;
}
