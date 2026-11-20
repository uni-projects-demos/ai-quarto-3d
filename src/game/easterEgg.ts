import { BOARD_WIN_LINES, sumWinCells, TRAIT_MASK } from "./rules";
import type { Cell, PcId } from "./types";

export const QUAKE_PENALTY_INTERVAL_MS = 30_000;

export function isQuakeLosingSelector(board: readonly Cell[], available: readonly PcId[]): boolean {
  return available.some((pc: PcId): boolean => sumWinCells(board, pc) > 0);
}

export function selectQuakeRemovalCell(
  board: readonly Cell[],
  available: readonly PcId[],
): number | null {
  const scores: number[] = Array(board.length).fill(0);
  let bestCell: number | null = null;

  for (const line of BOARD_WIN_LINES) {
    const occupied: number[] = [];
    let ones: number = TRAIT_MASK;
    let zeroes: number = TRAIT_MASK;

    for (const cell of line) {
      const pc: Cell | undefined = board[cell];
      if (pc === null || pc === undefined) continue;
      occupied.push(cell);
      ones &= pc;
      zeroes &= ~pc;
    }

    if (occupied.length === 0 || occupied.length === line.length) continue;
    if (((ones | zeroes) & TRAIT_MASK) === 0) continue;

    const extensions: number = available.filter(
      (pc: PcId): boolean => ((ones & pc) | (zeroes & ~pc)) !== 0,
    ).length;
    const lineWeight: number = occupied.length === 3 ? 10_000 : occupied.length === 2 ? 100 : 1;
    const score: number = extensions * lineWeight;
    for (const cell of occupied) scores[cell] = (scores[cell] ?? 0) + score;
  }

  for (let cell: number = 0; cell < board.length; cell += 1) {
    if (board[cell] === null) continue;
    if (bestCell === null || (scores[cell] ?? 0) > (scores[bestCell] ?? 0)) {
      bestCell = cell;
    }
  }
  return bestCell;
}

export class QuakePenaltyTimer {
  private timeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly onExpiry: () => boolean) {}

  start(): void {
    if (this.timeout !== null) return;
    this.timeout = setTimeout(this.onTick, QUAKE_PENALTY_INTERVAL_MS);
  }

  stop(): void {
    if (this.timeout !== null) clearTimeout(this.timeout);
    this.timeout = null;
  }

  private readonly onTick = (): void => {
    this.timeout = null;
    if (this.onExpiry()) this.start();
  };
}
