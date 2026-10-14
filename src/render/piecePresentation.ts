import { getPieceTraits, type PieceTraits, pieceStr } from "../game/pieces";
import type { PieceId } from "../game/types";

export function getPresentedPieceTraits(piece: PieceId): PieceTraits {
  return { ...getPieceTraits(piece), isSolid: pieceStr(piece).endsWith("1") };
}
