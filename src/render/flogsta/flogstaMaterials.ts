import type { CanvasTexture, MeshPhysicalMaterial, MeshPhysicalMaterialParameters } from "three";
import type { MaterialHelpers, ThemeMaterials } from "../themeMaterials";
import { createCoasterTexture } from "./flogstaCoasters";
import { createSugarTexture } from "./flogstaCoffee";
import { createSalmonTexture, createWeatheredTexture } from "./flogstaPieces";

export function createFlogstaMaterials({ mat, cells }: MaterialHelpers): ThemeMaterials {
  const pine: CanvasTexture = createWeatheredTexture();
  const timber: (tex: CanvasTexture) => MeshPhysicalMaterial = (
    tex: CanvasTexture,
  ): MeshPhysicalMaterial => mat({ map: tex, bumpMap: tex, bumpScale: 0.075, roughness: 0.98 });
  const balconyWood: MeshPhysicalMaterial = timber(pine);
  const boardWood: MeshPhysicalMaterial = timber(createWeatheredTexture(undefined, "chipboard"));
  const salmon: CanvasTexture = createSalmonTexture();
  const sugar: CanvasTexture = createSugarTexture();
  const coffeeSurface: MeshPhysicalMaterial = mat({
    color: 0x170a04,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    ior: 1.33,
    envMapIntensity: 2.5,
  });
  const wornEdge: MeshPhysicalMaterial = mat({
    color: 0x8c8974,
    map: pine,
    bumpMap: pine,
    bumpScale: 0.09,
    roughness: 1,
  });
  const coaster: (col: number, ink: number) => MeshPhysicalMaterialParameters = (
    col: number,
    ink: number,
  ): MeshPhysicalMaterialParameters => {
    const paper: CanvasTexture = createCoasterTexture(col, ink);
    return { map: paper, bumpMap: paper, bumpScale: 0.004, roughness: 1 };
  };
  return {
    table: balconyWood,
    edge: wornEdge,
    board: boardWood,
    rim: wornEdge,
    cells: cells(coaster(0x668b9b, 0xc8b46e), coaster(0xc8b46e, 0x668b9b)),
    pieces: {
      darkBody: mat({
        color: 0x110704,
        roughness: 0.12,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        ior: 1.33,
        envMapIntensity: 0.45,
      }),
      redBody: mat({ color: 0xfff4db, roughness: 0.66, sheen: 0.18 }),
    },
    hollowDark: coffeeSurface,
    hollowLight: mat({
      map: salmon,
      bumpMap: salmon,
      bumpScale: 0.003,
      roughness: 0.35,
      clearcoat: 0.45,
      clearcoatRoughness: 0.3,
      sheen: 0.12,
      sheenColor: 0xffb9a3,
    }),
    accent: wornEdge,
    coffee: {
      glass: mat({
        color: 0xcbdce0,
        transparent: true,
        opacity: 0.055,
        depthWrite: false,
        ior: 1.46,
        roughness: 0.065,
        clearcoat: 1,
        envMapIntensity: 2,
      }),
      surface: coffeeSurface,
      bubble: mat({ color: 0x6a3c1e, roughness: 0.13, clearcoat: 1 }),
      sugar: mat({ map: sugar, bumpMap: sugar, bumpScale: 0.012, roughness: 0.95 }),
    },
  };
}
