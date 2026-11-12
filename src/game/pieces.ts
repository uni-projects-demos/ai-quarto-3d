import type { PieceId } from "./types";
import { PIECE_IDS } from "./types";

export const TRAIT_MASK = [0b1000, 0b0010, 0b0001, 0b0100] as const;
const PIECE_TRAIT_MASK = {
  isRound: TRAIT_MASK[2],
  isBig: TRAIT_MASK[1],
  isSolid: TRAIT_MASK[3],
  isDark: TRAIT_MASK[0],
} as const;

export const GAME_PIECES: readonly PieceId[] = PIECE_IDS;

export interface PieceTraits {
  readonly isRound: boolean;
  readonly isBig: boolean;
  readonly isSolid: boolean;
  readonly isDark: boolean;
}

function hasTrait(pc: PieceId, mask: number): boolean {
  return (pc & mask) !== 0;
}

export function getPieceTraits(pc: PieceId): PieceTraits {
  return {
    isRound: hasTrait(pc, PIECE_TRAIT_MASK.isRound),
    isBig: hasTrait(pc, PIECE_TRAIT_MASK.isBig),
    isSolid: hasTrait(pc, PIECE_TRAIT_MASK.isSolid),
    isDark: hasTrait(pc, PIECE_TRAIT_MASK.isDark),
  };
}

function bit(val: boolean): "0" | "1" {
  return val ? "1" : "0";
}

export function pieceStr(pc: PieceId): string {
  const { isDark, isBig, isRound, isSolid } = getPieceTraits(pc);
  return `${bit(isDark)}${bit(isBig)}${bit(isRound)}${bit(!isSolid)}`;
}
