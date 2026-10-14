import type { Cell, GameMode, Participant, Phase, PieceId, Turn } from "./types";

export type HistEventType = "place" | "select";

export interface HistEvent {
  readonly curPlayer: Turn;
  readonly eventType: HistEventType;
  readonly turnId: number;
}

function isTurnEvent(left: HistEvent, right: HistEvent): boolean {
  return left.curPlayer === right.curPlayer && left.turnId === right.turnId;
}

export function getUndoTarget(
  histEvents: readonly HistEvent[],
  idx: number,
  isAtomic: boolean,
  isEntireTurn: (action: HistEvent) => boolean,
): number {
  if (idx <= 0) return 0;
  let target: number = idx - 1;
  const action: HistEvent | undefined = histEvents[target];
  if (isAtomic || action === undefined || !isEntireTurn(action)) return target;

  while (target > 0) {
    const prev: HistEvent | undefined = histEvents[target - 1];
    if (prev === undefined || !isTurnEvent(prev, action)) break;
    target -= 1;
  }
  return target;
}

export function getRedoTarget(
  histEvents: readonly HistEvent[],
  idx: number,
  isAtomic: boolean,
  isEntireTurn: (action: HistEvent) => boolean,
): number {
  if (idx >= histEvents.length) return histEvents.length;
  let target: number = idx + 1;
  const action: HistEvent | undefined = histEvents[idx];
  if (isAtomic || action === undefined || !isEntireTurn(action)) return target;

  while (target < histEvents.length) {
    const nxt: HistEvent | undefined = histEvents[target];
    if (nxt === undefined || !isTurnEvent(nxt, action)) break;
    target += 1;
  }
  return target;
}

export type StepAI = "select-open" | HistEventType | null;

export interface GameState {
  readonly activeTurn: Turn;
  readonly nxtPieceAI: PieceId | null;
  readonly stepAI: StepAI;
  readonly board: readonly Cell[];
  readonly pendingPiece: PieceId | null;
  readonly phase: Phase;
  readonly remaining: readonly PieceId[];
  readonly turnId: number;
  readonly winner: Turn | "draw" | null;
}

export function toggleTurn(turn: Turn): Turn {
  return turn === "player1" ? "player2" : "player1";
}

export function getTurnPlayer(mode: GameMode, turn: Turn): Participant {
  if (mode === "human-human") return "human";
  if (mode === "ai-ai") return "ai";
  return turn === "player1" ? "human" : "ai";
}
