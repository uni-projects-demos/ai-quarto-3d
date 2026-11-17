import {
  type CanvasTexture,
  MeshPhysicalMaterial,
  type MeshPhysicalMaterialParameters,
  type Texture,
} from "three";
import { CELL_COUNT } from "../game/rules";
import type { ThemeId } from "../themes";
import { createBunkMaterials } from "./bunk/bunkMaterials";
import type { CoffeeMaterials } from "./flogsta/flogstaCoffee";
import { createFlogstaMaterials } from "./flogsta/flogstaMaterials";
import { createMarbleMaterials } from "./marble/marbleMaterials";
import { createNatureMaterials } from "./nature/natureMaterials";
import { createQuakeMaterials } from "./quake/quakeMaterials";
import type { SceneResources } from "./SceneResources";
import type { VictorianCraftMaterials } from "./victorian/victorianCraft";
import { createVictorianMaterials } from "./victorian/victorianMaterials";

export interface PieceMaterials {
  darkBody: MeshPhysicalMaterial;
  redBody: MeshPhysicalMaterial;
}

export interface ThemeMaterials {
  table: MeshPhysicalMaterial;
  edge: MeshPhysicalMaterial;
  board: MeshPhysicalMaterial;
  rim: MeshPhysicalMaterial;
  cells: MeshPhysicalMaterial[];
  pieces: PieceMaterials;
  hollowDark: MeshPhysicalMaterial;
  hollowLight: MeshPhysicalMaterial;
  accent: MeshPhysicalMaterial;
  craft?: VictorianCraftMaterials;
  coffee?: CoffeeMaterials;
  quakeBodies?: readonly MeshPhysicalMaterial[];
  quakeInsets?: readonly MeshPhysicalMaterial[];
}

export interface MaterialHelpers {
  readonly load: (url: string) => Texture;
  readonly wood: CanvasTexture;
  readonly resMap: SceneResources;
  readonly mat: (params: MeshPhysicalMaterialParameters) => MeshPhysicalMaterial;
  readonly cells: (
    even: MeshPhysicalMaterialParameters,
    odd: MeshPhysicalMaterialParameters,
  ) => MeshPhysicalMaterial[];
}

export function createThemeMaterials(
  load: (url: string) => Texture,
  wood: CanvasTexture,
  resMap: SceneResources,
): Record<ThemeId, ThemeMaterials> {
  const mat: (params: MeshPhysicalMaterialParameters) => MeshPhysicalMaterial = (
    params: MeshPhysicalMaterialParameters,
  ): MeshPhysicalMaterial => resMap.track(new MeshPhysicalMaterial(params));
  const cells: (
    even: MeshPhysicalMaterialParameters,
    odd: MeshPhysicalMaterialParameters,
  ) => MeshPhysicalMaterial[] = (
    even: MeshPhysicalMaterialParameters,
    odd: MeshPhysicalMaterialParameters,
  ): MeshPhysicalMaterial[] =>
    Array.from(
      { length: CELL_COUNT },
      (_: unknown, idx: number): MeshPhysicalMaterial =>
        mat({ ...(idx % 2 === 0 ? even : odd), emissive: 0x000000 }),
    );
  const helpers: MaterialHelpers = { load, wood, resMap, mat, cells };
  return {
    bunk: createBunkMaterials(helpers),
    flogsta: createFlogstaMaterials(helpers),
    marble: createMarbleMaterials(helpers),
    nature: createNatureMaterials(helpers),
    quake: createQuakeMaterials(helpers),
    victorian: createVictorianMaterials(helpers),
  };
}
