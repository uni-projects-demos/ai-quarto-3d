export { getRandVal, selectStartCell, selectStartPiece } from "./opening";

import {
  CELL_COUNT,
  cellPlacementScore,
  getEmptyCells,
  isBoardFull,
  isWinCellPlacement,
  sumWinCells,
} from "../game/rules";
import type { Cell, Difficulty, MoveAI, PieceId } from "../game/types";

const MATE_SCORE: number = 100_000;
class SearchLimitErr extends Error {
  override readonly name: "SearchLimitError" = "SearchLimitError";
}

interface SearchContext {
  readonly maxNodes: number;
  nodes: number;
  readonly transposition: Map<string, number>;
}

interface ScoredMove {
  readonly cell: number;
  readonly nxtPiece: PieceId | null;
  readonly score: number;
}

interface SearchProfile {
  readonly maxNodes: number;
  readonly maxDepth: number;
}

interface OrderedCell {
  readonly cell: number;
  readonly isWin: boolean;
  readonly score: number;
}

interface OrderedPiece {
  readonly piece: PieceId;
  readonly danger: number;
}

export interface SearchOptions {
  startCell?: number | undefined;
  onProgress?: (depth: number, nodes: number) => void;
}

function remainingPiecesMask(remainingPieces: readonly PieceId[]): number {
  let mask: number = 0;
  for (const piece of remainingPieces) {
    mask |= 1 << piece;
  }
  return mask;
}

function getStateKey(
  board: readonly Cell[],
  curPiece: PieceId,
  remainingPieces: readonly PieceId[],
  depth: number,
): string {
  let boardKey: string = "";
  for (const cell of board) {
    boardKey += cell === null ? "_" : cell.toString(CELL_COUNT);
  }
  return `${boardKey}:${curPiece.toString(CELL_COUNT)}:${remainingPiecesMask(remainingPieces).toString(CELL_COUNT)}:${depth}`;
}

function assertNode(context: SearchContext): void {
  context.nodes += 1;
  if (context.nodes > context.maxNodes) {
    throw new SearchLimitErr();
  }
}

function orderCells(board: readonly Cell[], piece: PieceId): number[] {
  return getEmptyCells(board)
    .map((cell: number): OrderedCell => {
      const isWin: boolean = isWinCellPlacement(board, cell, piece);

      return {
        cell,
        isWin,
        score: isWin ? 0 : cellPlacementScore(board, cell, piece),
      };
    })
    .sort(
      (a: OrderedCell, b: OrderedCell): number =>
        Number(b.isWin) - Number(a.isWin) || b.score - a.score,
    )
    .map(({ cell }: OrderedCell): number => cell);
}

function orderPieces(board: readonly Cell[], remainingPieces: readonly PieceId[]): PieceId[] {
  return remainingPieces
    .map(
      (piece: PieceId): OrderedPiece => ({
        piece,
        danger: sumWinCells(board, piece),
      }),
    )
    .sort((a: OrderedPiece, b: OrderedPiece): number => a.danger - b.danger || a.piece - b.piece)
    .map(({ piece }: OrderedPiece): PieceId => piece);
}

function removePiece(remainingPieces: readonly PieceId[], selected: PieceId): PieceId[] {
  return remainingPieces.filter((piece: PieceId): boolean => piece !== selected);
}

function evalTurn(board: readonly Cell[], curPiece: PieceId): number {
  const cells: number[] = getEmptyCells(board);
  let winCellPlacements: number = 0;

  for (const cell of cells) {
    if (isWinCellPlacement(board, cell, curPiece)) {
      winCellPlacements += 1;
    }
  }

  if (winCellPlacements > 0) {
    return 5_000 + winCellPlacements * 200;
  }

  let bestScore: number = 0;
  let sumScore: number = 0;

  for (const cell of cells) {
    const score: number = cellPlacementScore(board, cell, curPiece);
    bestScore = Math.max(bestScore, score);
    sumScore += score;
  }
  return bestScore * CELL_COUNT + sumScore;
}

function negamax(
  board: Cell[],
  curPiece: PieceId,
  remainingPieces: readonly PieceId[],
  depth: number,
  initialAlpha: number,
  beta: number,
  ply: number,
  context: SearchContext,
): number {
  assertNode(context);

  if (depth <= 0) {
    return evalTurn(board, curPiece);
  }

  const stateKey: string = getStateKey(board, curPiece, remainingPieces, depth);
  const cached: number | undefined = context.transposition.get(stateKey);
  if (cached !== undefined) return cached;

  let alpha: number = initialAlpha;
  let best: number = -Infinity;
  let isCutoff: boolean = false;

  for (const cell of orderCells(board, curPiece)) {
    const wins: boolean = isWinCellPlacement(board, cell, curPiece);
    board[cell] = curPiece;

    if (wins) {
      board[cell] = null;
      return MATE_SCORE - ply;
    }

    if (isBoardFull(board)) {
      best = Math.max(best, 0);
      board[cell] = null;
      continue;
    }

    for (const nxtPiece of orderPieces(board, remainingPieces)) {
      const score: number = -negamax(
        board,
        nxtPiece,
        removePiece(remainingPieces, nxtPiece),
        depth - 1,
        -beta,
        -alpha,
        ply + 1,
        context,
      );

      best = Math.max(best, score);
      alpha = Math.max(alpha, score);

      if (alpha >= beta) {
        isCutoff = true;
        break;
      }
    }

    board[cell] = null;
    if (isCutoff) break;
  }

  const res: number = Number.isFinite(best) ? best : 0;
  if (!isCutoff) {
    context.transposition.set(stateKey, res);
  }
  return res;
}

function isCellAvailable(board: readonly Cell[], startCell: number): boolean {
  if (startCell < 0 || startCell >= board.length || board[startCell] !== null) {
    throw new Error(`Starting cell ${startCell} is not available.`);
  }
  return true;
}

function rootCells(board: readonly Cell[], curPiece: PieceId, startCell?: number): number[] {
  if (startCell === undefined) {
    return orderCells(board, curPiece);
  }
  isCellAvailable(board, startCell);
  return [startCell];
}

function searchAtDepth(
  boardInput: readonly Cell[],
  remainingPieces: readonly PieceId[],
  curPiece: PieceId,
  depth: number,
  context: SearchContext,
  startCell?: number,
): ScoredMove {
  const board: Cell[] = [...boardInput];
  let best: ScoredMove | null = null;
  let alpha: number = -Infinity;

  for (const cell of rootCells(board, curPiece, startCell)) {
    if (isWinCellPlacement(board, cell, curPiece)) {
      return {
        cell,
        nxtPiece: null,
        score: MATE_SCORE,
      };
    }

    board[cell] = curPiece;

    if (isBoardFull(board)) {
      const candidate: ScoredMove = {
        cell,
        nxtPiece: null,
        score: 0,
      };

      if (best === null || candidate.score > best.score) {
        best = candidate;
      }
      board[cell] = null;
      continue;
    }

    for (const nxtPiece of orderPieces(board, remainingPieces)) {
      assertNode(context);

      const score: number = -negamax(
        board,
        nxtPiece,
        removePiece(remainingPieces, nxtPiece),
        depth - 1,
        -Infinity,
        -alpha,
        1,
        context,
      );

      if (best === null || score > best.score) {
        best = { cell, nxtPiece, score };
      }
      alpha = Math.max(alpha, score);
    }
    board[cell] = null;
  }

  if (best === null) {
    throw new Error("No valid (AI) move exists.");
  }
  return best;
}

function easyMove(
  board: readonly Cell[],
  remainingPieces: readonly PieceId[],
  curPiece: PieceId,
  startCell?: number,
): MoveAI {
  const legal: number[] = getEmptyCells(board);
  const firstCell: number | undefined = legal[0];

  if (firstCell === undefined) {
    throw new Error("No valid (AI) move exists.");
  }

  let cell: number;
  if (startCell !== undefined && isCellAvailable(board, startCell)) {
    cell = startCell;
  } else {
    const winningCell: number | undefined = legal.find((candidate: number): boolean =>
      isWinCellPlacement(board, candidate, curPiece),
    );

    cell = winningCell ?? firstCell;
    if (winningCell === undefined) {
      let lowestScore: number = cellPlacementScore(board, cell, curPiece);

      for (const candidate of legal.slice(1)) {
        const score: number = cellPlacementScore(board, candidate, curPiece);

        if (score < lowestScore) {
          cell = candidate;
          lowestScore = score;
        }
      }
    }
  }

  const boardAfter: Cell[] = [...board];
  boardAfter[cell] = curPiece;

  let nxtPiece: PieceId | null = null;

  if (!isBoardFull(boardAfter) && remainingPieces.length > 0) {
    let highestDanger: number = -1;

    for (const candidate of remainingPieces) {
      const danger: number = sumWinCells(boardAfter, candidate);

      if (
        danger > highestDanger ||
        (danger === highestDanger && (nxtPiece === null || candidate < nxtPiece))
      ) {
        nxtPiece = candidate;
        highestDanger = danger;
      }
    }
  }

  return {
    cell,
    nxtPiece,
    score: 0,
    depth: 0,
    nodes: 0,
    strategy: "heuristic",
  };
}

function profile(difficulty: Difficulty, remainingPiecesCount: number): SearchProfile {
  if (difficulty === "easy") {
    return { maxNodes: 241, maxDepth: 1 };
  }

  if (difficulty === "medium") {
    return { maxNodes: 100_000, maxDepth: remainingPiecesCount > 11 ? 3 : 2 };
  }

  // hard difficulty
  if (remainingPiecesCount > 13) {
    return { maxNodes: 1_000_000, maxDepth: 2 };
  }
  if (remainingPiecesCount > 10) {
    return { maxNodes: 1_000_000, maxDepth: 4 };
  }
  if (remainingPiecesCount > 4) {
    return { maxNodes: 1_000_000, maxDepth: 5 };
  }
  return { maxNodes: 1_000_000, maxDepth: remainingPiecesCount };
}

export function findMoveAI(
  board: readonly Cell[],
  remainingPieces: readonly PieceId[],
  curPiece: PieceId,
  difficulty: Difficulty,
  options: SearchOptions = {},
): MoveAI {
  if (difficulty === "easy" && remainingPieces.length < 13) {
    return easyMove(board, remainingPieces, curPiece, options.startCell);
  }
  if (difficulty === "medium" && remainingPieces.length < 4) {
    return easyMove(board, remainingPieces, curPiece, options.startCell);
  }

  const { maxNodes, maxDepth } = profile(difficulty, remainingPieces.length);
  const context: SearchContext = {
    maxNodes,
    nodes: 0,
    transposition: new Map(),
  };

  let completed: ScoredMove | null = null;
  let completedDepth: number = 0;

  for (let depth: number = 1; depth <= maxDepth; depth += 1) {
    try {
      completed = searchAtDepth(
        board,
        remainingPieces,
        curPiece,
        depth,
        context,
        options.startCell,
      );

      completedDepth = depth;
      options.onProgress?.(depth, context.nodes);

      if (completed.score >= MATE_SCORE - CELL_COUNT) {
        break;
      }
    } catch (error: unknown) {
      if (error instanceof SearchLimitErr) break;
      throw error;
    }
  }

  if (completed === null) {
    return {
      ...easyMove(board, remainingPieces, curPiece, options.startCell),
      nodes: context.nodes,
    };
  }
  return {
    ...completed,
    depth: completedDepth,
    nodes: context.nodes,
    strategy: "search",
  };
}
