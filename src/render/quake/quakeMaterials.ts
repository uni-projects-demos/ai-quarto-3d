import type { CanvasTexture, MeshPhysicalMaterial } from "three";
import { GAME_PIECES, getPieceTraits } from "../../game/pieces";
import { CELL_COUNT } from "../../game/rules";
import type { MaterialHelpers, ThemeMaterials } from "../themeMaterials";
import { quakeCellColourIndex, quakePieceColour } from "./quakePalette";
import {
  createQuakeBoardTexture,
  createQuakeBrickTexture,
  createQuakeCardboardTexture,
  createQuakePlasticTexture,
} from "./quakeTextures";

export const QUAKE_CELL_COLS: readonly [2499622, 11348268] = [0x262426, 0xad292c] as const;

export function createQuakeMaterials({ resMap, mat }: MaterialHelpers): ThemeMaterials {
  const plastic: CanvasTexture = resMap.track(createQuakePlasticTexture());
  const quakeGrit: CanvasTexture = resMap.track(createQuakeBoardTexture());
  const quakeBrick: CanvasTexture = resMap.track(createQuakeBrickTexture());
  const quakeCardboard: CanvasTexture = resMap.track(createQuakeCardboardTexture());
  const quakePiece: (colour: number, texture: CanvasTexture) => MeshPhysicalMaterial = (
    colour: number,
    texture: CanvasTexture,
  ): MeshPhysicalMaterial =>
    mat({
      color: colour,
      map: texture,
      bumpMap: texture,
      bumpScale: texture === quakeBrick ? 0.037 : 0.012,
      roughness: texture === quakeBrick ? 0.97 : 0.88,
      metalness: 0,
      clearcoat: texture === quakeBrick ? 0 : 0.035,
    });
  const quakeBodies: MeshPhysicalMaterial[] = GAME_PIECES.map(
    (pc): MeshPhysicalMaterial =>
      quakePiece(quakePieceColour(pc), getPieceTraits(pc).isRound ? quakeCardboard : quakeBrick),
  );
  const quakeBodyAt: (pc: number) => MeshPhysicalMaterial = (pc: number): MeshPhysicalMaterial => {
    const body: MeshPhysicalMaterial | undefined = quakeBodies[pc];
    if (!body) throw new Error(`Missing Quake piece material for ${pc}`);
    return body;
  };
  const quakeInsets: MeshPhysicalMaterial[] = GAME_PIECES.map(
    (pc): MeshPhysicalMaterial =>
      mat({
        color: quakeBodyAt(pc).color.clone().multiplyScalar(0.61),
        map: getPieceTraits(pc).isRound ? quakeCardboard : quakeBrick,
        roughness: 1,
      }),
  );
  const quakeInsetAt: (pc: number) => MeshPhysicalMaterial = (pc: number): MeshPhysicalMaterial => {
    const inset: MeshPhysicalMaterial | undefined = quakeInsets[pc];
    if (!inset) throw new Error(`Missing Quake inset material for ${pc}`);
    return inset;
  };
  return {
    table: mat({
      color: 0xe7e4dc,
      map: plastic,
      bumpMap: plastic,
      bumpScale: 0.018,
      roughness: 0.94,
      metalness: 0,
      clearcoat: 0.025,
    }),
    edge: mat({
      color: 0xd3d0c6,
      map: plastic,
      bumpMap: plastic,
      bumpScale: 0.024,
      roughness: 0.98,
    }),
    board: mat({ color: 0x222023, map: quakeGrit, roughness: 0.9 }),
    rim: mat({ color: 0xa72a2d, map: quakeGrit, roughness: 0.88 }),
    cells: Array.from(
      { length: CELL_COUNT },
      (_: unknown, cell: number): MeshPhysicalMaterial =>
        mat({
          color: QUAKE_CELL_COLS[quakeCellColourIndex(cell)],
          map: quakeGrit,
          roughness: 0.91,
          emissive: 0x000000,
        }),
    ),
    pieces: {
      darkBody: quakeBodyAt(8),
      redBody: quakeBodyAt(0),
    },
    quakeBodies,
    quakeInsets,
    hollowDark: quakeInsetAt(8),
    hollowLight: quakeInsetAt(0),
    accent: mat({ color: 0x972629, map: quakeGrit, roughness: 0.9 }),
  };
}
