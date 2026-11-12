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

function histTarget(
  histEvents: readonly HistEvent[],
  idx: number,
  dir: -1 | 1,
  isAtomic: boolean,
  isEntireTurn: (action: HistEvent) => boolean,
): number {
  let tgt: number = idx + dir;
  const action: HistEvent | undefined = histEvents[dir < 0 ? tgt : idx];
  if (isAtomic || action === undefined || !isEntireTurn(action)) return tgt;

  while (tgt > 0 && tgt < histEvents.length) {
    const adj: HistEvent | undefined = histEvents[dir < 0 ? tgt - 1 : tgt];
    if (adj === undefined || !isTurnEvent(adj, action)) break;
    tgt += dir;
  }
  return tgt;
}

export function getUndoTarget(
  histEvents: readonly HistEvent[],
  idx: number,
  isAtomic: boolean,
  isEntireTurn: (action: HistEvent) => boolean,
): number {
  return idx <= 0 ? 0 : histTarget(histEvents, idx, -1, isAtomic, isEntireTurn);
}

export function getRedoTarget(
  histEvents: readonly HistEvent[],
  idx: number,
  isAtomic: boolean,
  isEntireTurn: (action: HistEvent) => boolean,
): number {
  return idx >= histEvents.length
    ? histEvents.length
    : histTarget(histEvents, idx, 1, isAtomic, isEntireTurn);
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
