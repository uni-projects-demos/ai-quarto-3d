import { getPieceTraits, type PieceTraits, pieceStr } from "../game/pieces";
import type { PcId } from "../game/types";

export function getPresentedPieceTraits(pc: PcId): PieceTraits {
  return { ...getPieceTraits(pc), isSolid: pieceStr(pc).endsWith("1") };
}
