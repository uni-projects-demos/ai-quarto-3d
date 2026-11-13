import { getPieceTraits } from "../game/pieces";
import { BOARD_SIZE } from "../game/rules";
import type { PieceId } from "../game/types";

export function quakeCellColourIndex(cell: number): 0 | 1 {
  const row: number = Math.floor(cell / BOARD_SIZE);
  const col: number = cell % BOARD_SIZE;
  return (row + col) % 2 === 0 ? 0 : 1;
}

export const QUAKE_BRICK_COLOURS = {
  dark: [0x6b2d21, 0x7a3525, 0x873a28, 0x5f281d],
  light: [0xd99a73, 0xe5af84, 0xcd8964, 0xdfa47a],
} as const;
export const QUAKE_CARDBOARD_COLOURS = {
  dark: [0x6f5338, 0x7b5c3d, 0x664b31, 0x856444],
  light: [0xdfbf97, 0xebd0aa, 0xd6b388, 0xe4c6a0],
} as const;

export function quakePieceColour(pc: PieceId): number {
  const { isRound, isDark } = getPieceTraits(pc);
  const palette = isRound ? QUAKE_CARDBOARD_COLOURS : QUAKE_BRICK_COLOURS;
  const shade = ((pc & 0b0110) >> 1) as 0 | 1 | 2 | 3;
  return palette[isDark ? "dark" : "light"][shade];
}
