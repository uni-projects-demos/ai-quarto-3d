import type { MaterialHelpers, ThemeMaterials } from "../themeMaterials";

export const BUNK_CELL_COLS: readonly [number, number] = [0x315f7b, 0x47778b] as const;

export function createBunkMaterials({ mat, cells }: MaterialHelpers): ThemeMaterials {
  return {
    table: mat({ color: 0x2c5064, roughness: 0.82, clearcoat: 0.1 }),
    edge: mat({ color: 0xd4b17b, roughness: 0.64 }),
    board: mat({ color: 0x153449, roughness: 0.76, metalness: 0.08 }),
    rim: mat({ color: 0xd8b371, roughness: 0.42, metalness: 0.43 }),
    cells: cells(
      { color: BUNK_CELL_COLS[0], roughness: 0.48, metalness: 0.1, clearcoat: 0.27 },
      { color: BUNK_CELL_COLS[1], roughness: 0.48, metalness: 0.1, clearcoat: 0.27 },
    ),
    pieces: {
      darkBody: mat({ color: 0x153e72, roughness: 0.29, clearcoat: 0.5 }),
      redBody: mat({ color: 0xf1cd58, roughness: 0.34, clearcoat: 0.46 }),
    },
    hollowDark: mat({ color: 0x76d1d5, roughness: 0.35, metalness: 0.12 }),
    hollowLight: mat({ color: 0x28576c, roughness: 0.35, metalness: 0.12 }),
    accent: mat({ color: 0xe8ca91, roughness: 0.45, metalness: 0.28 }),
  };
}
