import {
  type CanvasTexture,
  MeshPhysicalMaterial,
  type MeshPhysicalMaterialParameters,
  RepeatWrapping,
  ShaderChunk,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from "three";
import boneUrl from "../../assets/themes/nature/bone-ivory.webp";
import mossUrl from "../../assets/themes/nature/forest-moss.webp";
import pauaUrl from "../../assets/themes/nature/paua-shell.webp";
import pounamuUrl from "../../assets/themes/nature/pounamu-stone.webp";
import puririTrunkUrl from "../../assets/themes/nature/puriri-trunk.webp";
import type { MaterialHelpers, ThemeMaterials } from "../themeMaterials";
import { createNatureCarvingTexture } from "./natureCarving";
import { createTrunkBarkTexture } from "./natureTable";

export function createNatureMaterials({
  load,
  resMap,
  mat,
  cells,
}: MaterialHelpers): ThemeMaterials {
  const puriri: Texture = load(puririTrunkUrl);
  const bark: CanvasTexture = createTrunkBarkTexture();
  const paua: Texture = load(pauaUrl);
  const pounamu: Texture = load(pounamuUrl);
  const bone: Texture = load(boneUrl);
  const moss: Texture = load(mossUrl);
  moss.wrapS = RepeatWrapping;
  moss.wrapT = RepeatWrapping;
  moss.repeat.set(24, 1);
  const carving: CanvasTexture = createNatureCarvingTexture();
  const oceanCarving: CanvasTexture = createNatureCarvingTexture("ocean");
  const natureTable: MeshPhysicalMaterial = mat({
    color: 0xfff1da,
    map: puriri,
    roughness: 0.34,
    metalness: 0,
    clearcoat: 0.62,
    clearcoatRoughness: 0.3,
  });
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
  return {
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
  };
}

function carvedMaterial(
  params: MeshPhysicalMaterialParameters,
  greenstone = false,
): MeshPhysicalMaterial {
  const mat = new MeshPhysicalMaterial(params);
  mat.onBeforeCompile = (shdr: WebGLProgramParametersWithUniforms): void => {
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
