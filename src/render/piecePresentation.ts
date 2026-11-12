import { getPieceTraits, type PieceTraits, pieceStr } from "../game/pieces";
import type { PieceId } from "../game/types";

export function getPresentedPieceTraits(pc: PieceId): PieceTraits {
  return { ...getPieceTraits(pc), isSolid: pieceStr(pc).endsWith("1") };
}
