import {
  CanvasTexture,
  MeshPhysicalMaterial,
  type MeshPhysicalMaterialParameters,
  RepeatWrapping,
  ShaderChunk,
  SRGBColorSpace,
  type Texture,
} from "three";
import blackOnyxUrl from "../assets/themes/black-onyx.webp";
import boneUrl from "../assets/themes/bone-ivory.webp";
import mossUrl from "../assets/themes/forest-moss.webp";
import garnetStoneUrl from "../assets/themes/garnet-stone.webp";
import marbleUrl from "../assets/themes/marble.webp";
import pauaUrl from "../assets/themes/paua-shell.webp";
import pounamuUrl from "../assets/themes/pounamu-stone.webp";
import puririTrunkUrl from "../assets/themes/puriri-trunk.webp";
import ebonyUrl from "../assets/themes/victorian-ebony.webp";
import mahoganyUrl from "../assets/themes/victorian-mahogany.webp";
import { CELL_COUNT } from "../game/rules";
import type { ThemeId } from "../themes";
import { createCoasterTexture } from "./flogstaCoasters";
import { type CoffeeMaterials, createSugarTexture } from "./flogstaCoffee";
import { createSalmonTexture, createWeatheredTexture } from "./flogstaPieces";
import { createNatureCarvingTexture } from "./natureCarving";
import { createTrunkBarkTexture } from "./natureTable";
import type { SceneResources } from "./SceneResources";
import { createSatinwoodTexture, type VictorianCraftMaterials } from "./victorianCraft";

export const MARBLE_CELL_COLS = [0xc5bca7, 0xaebbc0] as const;
export const VICTORIAN_CELL_COLS = [0xe7ce9c, 0xd7b888] as const;

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
}

export function createThemeMaterials(
  load: (url: string) => Texture,
  wood: CanvasTexture,
  resMap: SceneResources,
): Record<ThemeId, ThemeMaterials> {
  const mat = (params: MeshPhysicalMaterialParameters): MeshPhysicalMaterial =>
    resMap.track(new MeshPhysicalMaterial(params));
  const cells = (
    even: MeshPhysicalMaterialParameters,
    odd: MeshPhysicalMaterialParameters,
  ): MeshPhysicalMaterial[] =>
    Array.from({ length: CELL_COUNT }, (_, idx) =>
      mat({ ...(idx % 2 === 0 ? even : odd), emissive: 0x000000 }),
    );
  const marble = load(marbleUrl);
  const onyx = load(blackOnyxUrl);
  const garnet = load(garnetStoneUrl);
  const mahogany = load(mahoganyUrl);
  const ebony = load(ebonyUrl);
  const satinwood = createSatinwoodTexture();
  const puriri = load(puririTrunkUrl);
  const bark = createTrunkBarkTexture();
  const paua = load(pauaUrl);
  const pounamu = load(pounamuUrl);
  const bone = load(boneUrl);
  const moss = load(mossUrl);
  moss.wrapS = RepeatWrapping;
  moss.wrapT = RepeatWrapping;
  moss.repeat.set(24, 1);
  const carving = createNatureCarvingTexture();
  const oceanCarving = createNatureCarvingTexture("ocean");
  const goldGrain = createGoldGrainTexture();
  const goldColour = goldGrain.clone();
  goldColour.colorSpace = SRGBColorSpace;
  goldColour.needsUpdate = true;
  const preciousGold = mat({
    color: 0xf3c65c,
    map: goldColour,
    bumpMap: goldGrain,
    bumpScale: 0.002,
    roughness: 0.3,
    metalness: 0.7,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25,
  });
  const gold = mat({ color: 0xd3ad62, roughness: 0.26, metalness: 0.72, clearcoat: 0.3 });
  const brass = mat({ color: 0xb48c50, roughness: 0.48, metalness: 0.55 });
  const victorianDarkBody = mat({
    color: 0xc2c4c9,
    map: ebony,
    bumpMap: ebony,
    bumpScale: 0.003,
    roughness: 0.29,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.24,
  });
  const victorianRedBody = mat({
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
  const marbleTable = mat({
    color: 0xe8e5df,
    map: marble,
    roughness: 0.56,
    metalness: 0,
    clearcoat: 0.16,
    clearcoatRoughness: 0.6,
  });
  const victorianTable = mat({
    color: 0xc0a393,
    map: mahogany,
    roughness: 0.31,
    metalness: 0,
    clearcoat: 0.72,
    clearcoatRoughness: 0.26,
  });
  const natureTable = mat({
    color: 0xfff1da,
    map: puriri,
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.62,
    clearcoatRoughness: 0.3,
  });
  const pine = createWeatheredTexture();
  const timber = (tex: CanvasTexture): MeshPhysicalMaterial =>
    mat({ map: tex, bumpMap: tex, bumpScale: 0.075, roughness: 0.98 });
  const balconyWood = timber(pine);
  const boardWood = timber(createWeatheredTexture(undefined, "chipboard"));
  const salmon = createSalmonTexture();
  const sugar = createSugarTexture();
  const coffeeSurface = mat({
    color: 0x170a04,
    roughness: 0.06,
    clearcoat: 1,
    clearcoatRoughness: 0.025,
    ior: 1.33,
    envMapIntensity: 2.5,
  });
  const wornEdge = mat({
    color: 0x8c8974,
    map: pine,
    bumpMap: pine,
    bumpScale: 0.09,
    roughness: 1,
  });
  const coaster = (col: number, ink: number): MeshPhysicalMaterialParameters => {
    const paper = createCoasterTexture(col, ink);
    return { map: paper, bumpMap: paper, bumpScale: 0.004, roughness: 1 };
  };
  const shell: MeshPhysicalMaterialParameters = {
    map: paua,
    roughness: 0.23,
    metalness: 0.04,
    clearcoat: 0.85,
    clearcoatRoughness: 0.2,
    iridescence: 0.65,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [180, 380],
  };
  const pearl: MeshPhysicalMaterialParameters = {
    roughness: 0.29,
    metalness: 0.06,
    clearcoat: 0.68,
    clearcoatRoughness: 0.24,
    iridescence: 0.12,
  };
  return {
    flogsta: {
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
    },
    marble: {
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
    },
    victorian: {
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
    },
    nature: {
      table: natureTable,
      edge: mat({
        color: 0xe5d3b7,
        map: bark,
        bumpMap: bark,
        bumpScale: 0.09,
        roughness: 0.88,
        metalness: 0,
        clearcoat: 0.04,
        clearcoatRoughness: 0.88,
      }),
      board: mat({ ...shell, color: 0x82949c, roughness: 0.32 }),
      rim: mat({
        color: 0xa7b587,
        map: moss,
        bumpMap: moss,
        bumpScale: 0.014,
        roughness: 0.96,
        metalness: 0,
        sheen: 0.35,
        sheenColor: 0x739753,
        sheenRoughness: 0.95,
      }),
      cells: cells({ ...shell, color: 0xc9d6cc }, { ...shell, color: 0x94b9b7 }),
      pieces: {
        darkBody: resMap.track(
          carvedMaterial(
            {
              color: 0xb4c2b3,
              map: pounamu,
              bumpMap: carving,
              bumpScale: 0.08,
              roughness: 0.29,
              metalness: 0,
              clearcoat: 0.72,
              clearcoatRoughness: 0.25,
              ior: 1.61,
            },
            true,
          ),
        ),
        redBody: resMap.track(
          carvedMaterial({
            color: 0xd0d8e1,
            map: bone,
            bumpMap: oceanCarving,
            bumpScale: 0.08,
            roughness: 0.44,
            metalness: 0,
            clearcoat: 0.24,
            clearcoatRoughness: 0.42,
          }),
        ),
      },
      hollowDark: mat({ ...shell, color: 0xb6ced2 }),
      hollowLight: mat({ ...shell, color: 0xc1d6d4 }),
      accent: mat({ color: 0xbaad8e, map: bone, roughness: 0.36, clearcoat: 0.28 }),
    },
  };
}

function carvedMaterial(
  params: MeshPhysicalMaterialParameters,
  greenstone = false,
): MeshPhysicalMaterial {
  const mat = new MeshPhysicalMaterial(params);
  mat.onBeforeCompile = (shdr): void => {
    shdr.vertexShader = `#ifdef USE_BUMPMAP
      attribute float naturePieceHeight;
      varying float vNaturePieceHeight;
      #endif
      ${shdr.vertexShader}`;
    shdr.vertexShader = shdr.vertexShader.replace(
      "#include <uv_vertex>",
      `#include <uv_vertex>
       #ifdef USE_BUMPMAP
         vNaturePieceHeight = naturePieceHeight;
       #endif`,
    );
    shdr.fragmentShader = shdr.fragmentShader.replace(
      "#include <bumpmap_pars_fragment>",
      `#ifdef USE_BUMPMAP
         varying float vNaturePieceHeight;
         vec2 natureCarvingUv;
         float natureCutMask;
       #endif
       ${ShaderChunk.bumpmap_pars_fragment.replaceAll("vBumpMapUv", "natureCarvingUv")}`,
    );
    shdr.fragmentShader = shdr.fragmentShader.replace(
      "#include <map_fragment>",
      `#include <map_fragment>
       #ifdef USE_BUMPMAP
         natureCarvingUv = vBumpMapUv;
         float yFromBase = vBumpMapUv.y * vNaturePieceHeight;
         float baseBandV = 0.45 / 1.45;
         natureCarvingUv.y = yFromBase <= 0.45
           ? yFromBase / 1.45
           : baseBandV + (yFromBase - 0.45) / (vNaturePieceHeight - 0.45) * (1.0 - baseBandV);
         float carvingHeight = texture2D(bumpMap, natureCarvingUv).r;
         natureCutMask = 1.0 - smoothstep(0.12, 0.74, carvingHeight);
         ${
           greenstone
             ? "diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 0.7 + vec3(0.08, 0.12, 0.05), natureCutMask * 0.8);"
             : "diffuseColor.rgb *= mix(1.0, 0.38, natureCutMask);"
         }
       #endif`,
    );
    shdr.fragmentShader = shdr.fragmentShader.replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
       #ifdef USE_BUMPMAP
         roughnessFactor = mix(roughnessFactor, 0.6, natureCutMask * 0.65);
       #endif`,
    );
  };
  mat.customProgramCacheKey = (): string => `nature-wrap-kiwi-relief-v4-${greenstone}`;
  return mat;
}

function createGoldGrainTexture(): CanvasTexture {
  const cvs = document.createElement("canvas");
  cvs.width = 512;
  cvs.height = 512;
  const tex = new CanvasTexture(cvs);
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  const ctx = cvs.getContext("2d");
  if (!ctx) return tex;
  ctx.fillStyle = "#efefef";
  ctx.fillRect(0, 0, 512, 512);
  for (let row = 0; row < 512; row += 1) {
    const val = Math.round(227 + 14 * Math.sin(row * 17.31) + 5 * Math.cos(row * 3.8));
    ctx.fillStyle = `rgb(${val}, ${val}, ${val})`;
    ctx.fillRect(0, row, 512, 1);
  }
  tex.needsUpdate = true;
  return tex;
}
