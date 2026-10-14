import type { Cell, Difficulty, PieceId } from "../game/types";

const STARTING_CELLS = {
  easy: [1, 2, 4, 7, 8, 11, 13, 14],
  medium: [0, 3, 12, 15],
  hard: [5, 6, 9, 10],
} as const satisfies Record<Difficulty, readonly number[]>;

export function getRandVal(seed: number = Date.now()): () => number {
  let state: number = seed >>> 0;

  return (): number => {
    state += 0x6d2b79f5;
    let val: number = Math.imul(state ^ (state >>> 15), state | 1);
    val ^= val + Math.imul(val ^ (val >>> 7), val | 61);
    return ((val ^ (val >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function randSelectFrom<T>(arr: readonly T[], random: () => number): T {
  if (arr.length === 0) {
    throw new Error("List is empty - cannot randomly select from.");
  }

  const selectedT: T | undefined = arr[Math.floor(random() * arr.length)];
  if (selectedT === undefined) {
    throw new Error("Random selection failed.");
  }
  return selectedT;
}

export function selectStartPiece(
  remainingPieces: readonly PieceId[],
  random: () => number = Math.random,
): PieceId {
  return randSelectFrom(remainingPieces, random);
}

export function selectStartCell(
  board: readonly Cell[],
  difficulty: Difficulty,
  random: () => number = Math.random,
): number {
  const available = STARTING_CELLS[difficulty].filter((cell): boolean => board[cell] === null);
  return randSelectFrom(available, random);
}
