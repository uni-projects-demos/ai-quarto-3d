import {
  CanvasTexture,
  type MeshPhysicalMaterial,
  type MeshPhysicalMaterialParameters,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";
import blackOnyxUrl from "../../assets/themes/marble/black-onyx.webp";
import garnetStoneUrl from "../../assets/themes/marble/garnet-stone.webp";
import marbleUrl from "../../assets/themesmarble//marble.webp";
import type { MaterialHelpers, ThemeMaterials } from "../themeMaterials";

export const MARBLE_CELL_COLS: readonly [12958887, 11451328] = [0xc5bca7, 0xaebbc0] as const;

export function createMarbleMaterials({ load, wood, mat, cells }: MaterialHelpers): ThemeMaterials {
  const marble: Texture = load(marbleUrl);
  const onyx: Texture = load(blackOnyxUrl);
  const garnet: Texture = load(garnetStoneUrl);
  const goldGrain: CanvasTexture = createGoldGrainTexture();
  const goldColour: CanvasTexture = goldGrain.clone();
  goldColour.colorSpace = SRGBColorSpace;
  goldColour.needsUpdate = true;
  const preciousGold: MeshPhysicalMaterial = mat({
    color: 0xf3c65c,
    map: goldColour,
    bumpMap: goldGrain,
    bumpScale: 0.002,
    roughness: 0.3,
    metalness: 0.7,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25,
  });
  const gold: MeshPhysicalMaterial = mat({
    color: 0xd3ad62,
    roughness: 0.26,
    metalness: 0.72,
    clearcoat: 0.3,
  });
  const marbleTable: MeshPhysicalMaterial = mat({
    color: 0xe8e5df,
    map: marble,
    roughness: 0.56,
    metalness: 0,
    clearcoat: 0.16,
    clearcoatRoughness: 0.6,
  });
  const pearl: MeshPhysicalMaterialParameters = {
    roughness: 0.29,
    metalness: 0.06,
    clearcoat: 0.68,
    clearcoatRoughness: 0.24,
    iridescence: 0.12,
  };
  return {
    table: marbleTable,
    edge: marbleTable,
    board: mat({
      color: 0xd8c9b7,
      map: wood,
      roughness: 0.75,
      metalness: 0.02,
      clearcoat: 0.12,
      clearcoatRoughness: 0.86,
    }),
    rim: mat({
      color: 0xb9a086,
      map: wood,
      roughness: 0.66,
      metalness: 0.02,
      clearcoat: 0.18,
      clearcoatRoughness: 0.78,
    }),
    cells: cells(
      { ...pearl, color: MARBLE_CELL_COLS[0] },
      { ...pearl, color: MARBLE_CELL_COLS[1] },
    ),
    pieces: {
      darkBody: mat({
        color: 0x989ca6,
        map: onyx,
        roughness: 0.27,
        metalness: 0,
        clearcoat: 0.8,
        clearcoatRoughness: 0.2,
        ior: 1.58,
      }),
      redBody: mat({
        color: 0xba7c84,
        map: garnet,
        roughness: 0.28,
        metalness: 0,
        clearcoat: 0.8,
        clearcoatRoughness: 0.22,
        ior: 1.72,
      }),
    },
    hollowDark: preciousGold,
    hollowLight: preciousGold,
    accent: gold,
  };
}

function createGoldGrainTexture(): CanvasTexture {
  const cvs: HTMLCanvasElement = document.createElement("canvas");
  cvs.width = 512;
  cvs.height = 512;
  const tex = new CanvasTexture(cvs);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  const ctx: CanvasRenderingContext2D | null = cvs.getContext("2d");
  if (!ctx) return tex;
  ctx.fillStyle = "#efefef";
  ctx.fillRect(0, 0, 512, 512);
  for (let row: number = 0; row < 512; row += 1) {
    const val: number = Math.round(227 + 14 * Math.sin(row * 17.31) + 5 * Math.cos(row * 3.8));
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(0, row, 512, 1);
  }
  tex.needsUpdate = true;
  return tex;
}
