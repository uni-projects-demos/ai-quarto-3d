import { CELL_COUNT, isValidCell } from "../game/rules";
import {
  type Cell,
  isDifficulty,
  isPieceId,
  type PieceId,
  type RequestAI,
  type ResponseAI,
} from "../game/types";

function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

function isCount(val: unknown): val is number {
  return typeof val === "number" && Number.isSafeInteger(val) && val >= 0;
}

function isBoard(val: unknown): val is Cell[] {
  if (!Array.isArray(val) || val.length !== CELL_COUNT) return false;
  const cells: readonly unknown[] = val;
  for (const cell of cells) if (cell !== null && !isPieceId(cell)) return false;
  return true;
}

function isRemaining(val: unknown): val is PieceId[] {
  if (!Array.isArray(val)) return false;
  const pieces: readonly unknown[] = val;
  for (const piece of pieces) if (!isPieceId(piece)) return false;
  return true;
}

export function isRequestAI(val: unknown): val is RequestAI {
  if (
    !isRecord(val) ||
    val.type !== "find-move" ||
    !isCount(val.reqId) ||
    !isDifficulty(val.diff) ||
    !isPieceId(val.curPiece) ||
    !isBoard(val.board) ||
    !isRemaining(val.remaining)
  )
    return false;

  const board = val.board;
  const pieces = [...board.filter((cell) => cell !== null), ...val.remaining, val.curPiece];
  return (
    pieces.length === CELL_COUNT &&
    new Set(pieces).size === CELL_COUNT &&
    (val.startCell === undefined ||
      (typeof val.startCell === "number" && isValidCell(board, val.startCell)))
  );
}

export function isResponseAI(val: unknown): val is ResponseAI {
  if (!isRecord(val) || !isCount(val.reqId)) return false;
  if (val.type === "error") return typeof val.msg === "string";
  if (val.type === "progress") return isCount(val.depth) && isCount(val.nodes);
  if (val.type !== "result" || !isRecord(val.move)) return false;
  const move = val.move;
  return (
    isCount(move.cell) &&
    move.cell < CELL_COUNT &&
    (move.nxtPiece === null || isPieceId(move.nxtPiece)) &&
    typeof move.score === "number" &&
    Number.isFinite(move.score) &&
    isCount(move.depth) &&
    isCount(move.nodes) &&
    (!Object.hasOwn(move, "strategy") ||
      move.strategy === "heuristic" ||
      move.strategy === "search")
  );
}
