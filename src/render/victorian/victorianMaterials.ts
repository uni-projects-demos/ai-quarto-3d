import type { CanvasTexture, MeshPhysicalMaterial, Texture } from "three";
import ebonyUrl from "../../assets/themes/victorian/victorian-ebony.webp";
import mahoganyUrl from "../../assets/themes/victorian/victorian-mahogany.webp";
import type { MaterialHelpers, ThemeMaterials } from "../themeMaterials";
import { createSatinwoodTexture, type VictorianCraftMaterials } from "./victorianCraft";

export const VICTORIAN_CELL_COLS: readonly [15191708, 14137480] = [0xe7ce9c, 0xd7b888] as const;

export function createVictorianMaterials({ load, mat, cells }: MaterialHelpers): ThemeMaterials {
  const mahogany: Texture = load(mahoganyUrl);
  const ebony: Texture = load(ebonyUrl);
  const satinwood: CanvasTexture = createSatinwoodTexture();
  const brass: MeshPhysicalMaterial = mat({ color: 0xb48c50, roughness: 0.48, metalness: 0.55 });
  const victorianDarkBody: MeshPhysicalMaterial = mat({
    color: 0xc2c4c9,
    map: ebony,
    bumpMap: ebony,
    bumpScale: 0.003,
    roughness: 0.29,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.24,
  });
  const victorianRedBody: MeshPhysicalMaterial = mat({
    color: 0xf192a6,
    map: mahogany,
    bumpMap: mahogany,
    bumpScale: 0.002,
    roughness: 0.31,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.25,
  });
  const craft: VictorianCraftMaterials = {
    satinwood: mat({
      color: 0xdcb974,
      map: satinwood,
      roughness: 0.34,
      clearcoat: 0.58,
      clearcoatRoughness: 0.3,
    }),
    darkString: mat({ color: 0x544332, map: ebony, roughness: 0.36, clearcoat: 0.5 }),
    darkBody: victorianDarkBody,
    redBody: victorianRedBody,
    brass,
  };
  const victorianTable: MeshPhysicalMaterial = mat({
    color: 0xc0a393,
    map: mahogany,
    roughness: 0.31,
    metalness: 0,
    clearcoat: 0.72,
    clearcoatRoughness: 0.26,
  });
  return {
    table: victorianTable,
    edge: victorianTable,
    board: mat({
      color: 0xc0a083,
      map: mahogany,
      roughness: 0.44,
      metalness: 0.02,
      clearcoat: 0.45,
      clearcoatRoughness: 0.34,
    }),
    rim: brass,
    cells: cells(
      {
        color: VICTORIAN_CELL_COLS[0],
        map: satinwood,
        roughness: 0.4,
        metalness: 0,
        clearcoat: 0.46,
        clearcoatRoughness: 0.32,
      },
      {
        color: VICTORIAN_CELL_COLS[1],
        map: satinwood,
        roughness: 0.4,
        metalness: 0,
        clearcoat: 0.46,
        clearcoatRoughness: 0.32,
      },
    ),
    pieces: {
      darkBody: victorianDarkBody,
      redBody: victorianRedBody,
    },
    hollowDark: brass,
    hollowLight: brass,
    accent: brass,
    craft,
  };
}
