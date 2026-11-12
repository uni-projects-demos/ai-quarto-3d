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

function remainingPiecesMask(remPcs: readonly PieceId[]): number {
  let mask: number = 0;
  for (const pc of remPcs) {
    mask |= 1 << pc;
  }
  return mask;
}

function getStateKey(
  brd: readonly Cell[],
  curPiece: PieceId,
  remPcs: readonly PieceId[],
  depth: number,
): string {
  let boardKey: string = "";
  for (const cell of brd) {
    boardKey += cell === null ? "_" : cell.toString(CELL_COUNT);
  }
  return (
    `${boardKey}:${curPiece.toString(CELL_COUNT)}:` +
    `${remainingPiecesMask(remPcs).toString(CELL_COUNT)}:${depth}`
  );
}

function assertNode(ctx: SearchContext): void {
  ctx.nodes += 1;
  if (ctx.nodes > ctx.maxNodes) {
    throw new SearchLimitErr();
  }
}

function orderCells(brd: readonly Cell[], pc: PieceId): number[] {
  return getEmptyCells(brd)
    .map((cell: number): OrderedCell => {
      const isWin: boolean = isWinCellPlacement(brd, cell, pc);

      return {
        cell,
        isWin,
        score: isWin ? 0 : cellPlacementScore(brd, cell, pc),
      };
    })
    .sort(
      (a: OrderedCell, b: OrderedCell): number =>
        Number(b.isWin) - Number(a.isWin) || b.score - a.score,
    )
    .map(({ cell }: OrderedCell): number => cell);
}

function orderPieces(brd: readonly Cell[], remPcs: readonly PieceId[]): PieceId[] {
  return remPcs
    .map(
      (pc: PieceId): OrderedPiece => ({
        piece: pc,
        danger: sumWinCells(brd, pc),
      }),
    )
    .sort((a: OrderedPiece, b: OrderedPiece): number => a.danger - b.danger || a.piece - b.piece)
    .map(({ piece: pc }: OrderedPiece): PieceId => pc);
}

function removePiece(remPcs: readonly PieceId[], sel: PieceId): PieceId[] {
  return remPcs.filter((pc: PieceId): boolean => pc !== sel);
}

function evalTurn(brd: readonly Cell[], curPiece: PieceId): number {
  const cells: number[] = getEmptyCells(brd);
  let winCellPlaces: number = 0;

  for (const cell of cells) {
    if (isWinCellPlacement(brd, cell, curPiece)) {
      winCellPlaces += 1;
    }
  }

  if (winCellPlaces > 0) {
    return 5_000 + winCellPlaces * 200;
  }

  let bestScore: number = 0;
  let sumScore: number = 0;

  for (const cell of cells) {
    const score: number = cellPlacementScore(brd, cell, curPiece);
    bestScore = Math.max(bestScore, score);
    sumScore += score;
  }
  return bestScore * CELL_COUNT + sumScore;
}

function negamax(
  brd: Cell[],
  curPiece: PieceId,
  remPcs: readonly PieceId[],
  depth: number,
  initialAlpha: number,
  beta: number,
  ply: number,
  ctx: SearchContext,
): number {
  assertNode(ctx);

  if (depth <= 0) {
    return evalTurn(brd, curPiece);
  }

  const stateKey: string = getStateKey(brd, curPiece, remPcs, depth);
  const cache: number | undefined = ctx.transposition.get(stateKey);
  if (cache !== undefined) return cache;

  let alpha: number = initialAlpha;
  let best: number = -Infinity;
  let isCutoff: boolean = false;

  for (const cell of orderCells(brd, curPiece)) {
    const wins: boolean = isWinCellPlacement(brd, cell, curPiece);
    brd[cell] = curPiece;

    if (wins) {
      brd[cell] = null;
      return MATE_SCORE - ply;
    }

    if (isBoardFull(brd)) {
      best = Math.max(best, 0);
      brd[cell] = null;
      continue;
    }

    for (const nxtPiece of orderPieces(brd, remPcs)) {
      const score: number = -negamax(
        brd,
        nxtPiece,
        removePiece(remPcs, nxtPiece),
        depth - 1,
        -beta,
        -alpha,
        ply + 1,
        ctx,
      );

      best = Math.max(best, score);
      alpha = Math.max(alpha, score);

      if (alpha >= beta) {
        isCutoff = true;
        break;
      }
    }

    brd[cell] = null;
    if (isCutoff) break;
  }

  const res: number = Number.isFinite(best) ? best : 0;
  if (!isCutoff) {
    ctx.transposition.set(stateKey, res);
  }
  return res;
}

function isCellAvailable(brd: readonly Cell[], startCell: number): boolean {
  if (startCell < 0 || startCell >= brd.length || brd[startCell] !== null) {
    throw new Error(`Starting cell ${startCell} is not available.`);
  }
  return true;
}

function rootCells(brd: readonly Cell[], curPiece: PieceId, startCell?: number): number[] {
  if (startCell === undefined) {
    return orderCells(brd, curPiece);
  }
  isCellAvailable(brd, startCell);
  return [startCell];
}

function searchAtDepth(
  boardInput: readonly Cell[],
  remPcs: readonly PieceId[],
  curPiece: PieceId,
  depth: number,
  ctx: SearchContext,
  startCell?: number,
): ScoredMove {
  const brd: Cell[] = [...boardInput];
  let best: ScoredMove | null = null;
  let alpha: number = -Infinity;

  for (const cell of rootCells(brd, curPiece, startCell)) {
    if (isWinCellPlacement(brd, cell, curPiece)) {
      return {
        cell,
        nxtPiece: null,
        score: MATE_SCORE,
      };
    }

    brd[cell] = curPiece;

    if (isBoardFull(brd)) {
      const cand: ScoredMove = {
        cell,
        nxtPiece: null,
        score: 0,
      };

      if (best === null || cand.score > best.score) {
        best = cand;
      }
      brd[cell] = null;
      continue;
    }

    for (const nxtPiece of orderPieces(brd, remPcs)) {
      assertNode(ctx);

      const score: number = -negamax(
        brd,
        nxtPiece,
        removePiece(remPcs, nxtPiece),
        depth - 1,
        -Infinity,
        -alpha,
        1,
        ctx,
      );

      if (best === null || score > best.score) {
        best = { cell, nxtPiece, score };
      }
      alpha = Math.max(alpha, score);
    }
    brd[cell] = null;
  }

  if (best === null) {
    throw new Error("No valid (AI) move exists.");
  }
  return best;
}

function easyMove(
  brd: readonly Cell[],
  remPcs: readonly PieceId[],
  curPiece: PieceId,
  startCell?: number,
): MoveAI {
  const legal: number[] = getEmptyCells(brd);
  const fstCell: number | undefined = legal[0];

  if (fstCell === undefined) {
    throw new Error("No valid (AI) move exists.");
  }

  let cell: number;
  if (startCell !== undefined && isCellAvailable(brd, startCell)) {
    cell = startCell;
  } else {
    const winCell: number | undefined = legal.find((cand: number): boolean =>
      isWinCellPlacement(brd, cand, curPiece),
    );

    cell = winCell ?? fstCell;
    if (winCell === undefined) {
      let lowestScore: number = cellPlacementScore(brd, cell, curPiece);

      for (const cand of legal.slice(1)) {
        const score: number = cellPlacementScore(brd, cand, curPiece);

        if (score < lowestScore) {
          cell = cand;
          lowestScore = score;
        }
      }
    }
  }

  const boardAfter: Cell[] = [...brd];
  boardAfter[cell] = curPiece;

  let nxtPiece: PieceId | null = null;

  if (!isBoardFull(boardAfter) && remPcs.length > 0) {
    let highestDanger: number = -1;

    for (const cand of remPcs) {
      const danger: number = sumWinCells(boardAfter, cand);

      if (
        danger > highestDanger ||
        (danger === highestDanger && (nxtPiece === null || cand < nxtPiece))
      ) {
        nxtPiece = cand;
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

function profile(diff: Difficulty, remPcCnt: number): SearchProfile {
  if (diff === "easy") {
    return { maxNodes: 241, maxDepth: 1 };
  }

  if (diff === "medium") {
    return { maxNodes: 100_000, maxDepth: remPcCnt > 11 ? 3 : 2 };
  }

  // hard difficulty
  if (remPcCnt > 13) {
    return { maxNodes: 1_000_000, maxDepth: 2 };
  }
  if (remPcCnt > 10) {
    return { maxNodes: 1_000_000, maxDepth: 4 };
  }
  if (remPcCnt > 4) {
    return { maxNodes: 1_000_000, maxDepth: 5 };
  }
  return { maxNodes: 1_000_000, maxDepth: remPcCnt };
}

export function findMoveAI(
  brd: readonly Cell[],
  remPcs: readonly PieceId[],
  curPiece: PieceId,
  diff: Difficulty,
  opts: SearchOptions = {},
): MoveAI {
  if (diff === "easy" && remPcs.length < 13) {
    return easyMove(brd, remPcs, curPiece, opts.startCell);
  }
  if (diff === "medium" && remPcs.length < 4) {
    return easyMove(brd, remPcs, curPiece, opts.startCell);
  }

  const { maxNodes, maxDepth } = profile(diff, remPcs.length);
  const ctx: SearchContext = {
    maxNodes,
    nodes: 0,
    transposition: new Map(),
  };

  let completed: ScoredMove | null = null;
  let completedDepth: number = 0;

  for (let depth: number = 1; depth <= maxDepth; depth += 1) {
    try {
      completed = searchAtDepth(brd, remPcs, curPiece, depth, ctx, opts.startCell);

      completedDepth = depth;
      opts.onProgress?.(depth, ctx.nodes);

      if (completed.score >= MATE_SCORE - CELL_COUNT) {
        break;
      }
    } catch (err: unknown) {
      if (err instanceof SearchLimitErr) break;
      throw err;
    }
  }

  if (completed === null) {
    return {
      ...easyMove(brd, remPcs, curPiece, opts.startCell),
      nodes: ctx.nodes,
    };
  }
  return {
    ...completed,
    depth: completedDepth,
    nodes: ctx.nodes,
    strategy: "search",
  };
}
