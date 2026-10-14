export const PIECE_IDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] as const;

export type PieceId = (typeof PIECE_IDS)[number];
export type Cell = PieceId | null;

export type Turn = "player1" | "player2";
export type Participant = "human" | "ai";
export type GameMode = "human-human" | "human-ai" | "ai-ai";
export type Difficulty = "easy" | "medium" | "hard";
export type Starter = Turn | "random";
export type Phase = "select" | "place" | "thinking" | "finished";
export type Strategy = "heuristic" | "search";

export function isPieceId(val: unknown): val is PieceId {
  return typeof val === "number" && Number.isInteger(val) && val >= 0 && val < PIECE_IDS.length;
}

export function isDifficulty(val: unknown): val is Difficulty {
  return val === "easy" || val === "medium" || val === "hard";
}

export function isGameMode(val: unknown): val is GameMode {
  return val === "human-human" || val === "human-ai" || val === "ai-ai";
}

export function isStarter(val: unknown): val is Starter {
  return val === "player1" || val === "player2" || val === "random";
}

export type WinLine = readonly [number, number, number, number];

export interface MoveAI {
  readonly cell: number;
  readonly nxtPiece: PieceId | null;
  readonly score: number;
  readonly depth: number;
  readonly nodes: number;
  readonly strategy?: Strategy;
}

interface MsgAI {
  readonly reqId: number;
}

export interface RequestAI extends MsgAI {
  readonly type: "find-move";
  readonly board: readonly Cell[];
  readonly remaining: readonly PieceId[];
  readonly curPiece: PieceId;
  readonly diff: Difficulty;
  readonly startCell?: number | undefined;
}

export type ResponseAI = MsgAI &
  (
    | {
        type: "progress";
        depth: number;
        nodes: number;
      }
    | {
        type: "result";
        move: MoveAI;
      }
    | {
        type: "error";
        msg: string;
      }
  );
