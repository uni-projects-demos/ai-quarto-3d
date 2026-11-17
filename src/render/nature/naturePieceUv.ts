import {
  type BufferAttribute,
  type BufferGeometry,
  Float32BufferAttribute,
  type InterleavedBufferAttribute,
} from "three";
import type { PieceTraits } from "../../game/pieces";
import type { PcId } from "../../game/types";
import { squareCarvingU } from "./natureCarving";

export function applyNaturePieceUv(geom: BufferGeometry, pc: PcId, traits: PieceTraits): void {
  const uvs: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("uv");
  const posArr: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("position");
  const normals: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("normal");
  const carvingUVs: BufferAttribute = uvs.clone();
  const hgt: number = traits.isBig ? 1.45 : 0.9;
  const offsetU: number = ((pc * 7 + 3) % 17) / 34;
  const offsetV: number = ((pc * 11 + 5) % 19) / 38;
  for (let vtx: number = 0; vtx < uvs.count; vtx += 1) {
    const perimeterU: number = traits.isRound
      ? uvs.getX(vtx) + 0.125
      : squareCarvingU(posArr.getX(vtx), posArr.getZ(vtx));
    let u: number = uvs.getX(vtx);
    let v: number = traits.isRound ? posArr.getY(vtx) / hgt + 0.5 : uvs.getY(vtx);
    if (Math.abs(normals.getY(vtx)) > 0.95) {
      const wdt: number = traits.isRound ? 0.86 : 0.74;
      u = posArr.getX(vtx) / wdt + 0.5;
      v = posArr.getZ(vtx) / wdt + 0.5;
    } else if (!traits.isRound) {
      u =
        (Math.abs(normals.getX(vtx)) > Math.abs(normals.getZ(vtx))
          ? posArr.getZ(vtx)
          : posArr.getX(vtx)) /
          0.74 +
        0.5;
      v = posArr.getY(vtx) / hgt + 0.5;
    }
    const isPlainTop: boolean = normals.getY(vtx) > 0.65 && posArr.getY(vtx) > 0;
    const isInsideCup: boolean =
      !traits.isSolid &&
      posArr.getY(vtx) > hgt / 2 - 0.14 &&
      (traits.isRound
        ? Math.hypot(posArr.getX(vtx), posArr.getZ(vtx)) < 0.29
        : Math.max(Math.abs(posArr.getX(vtx)), Math.abs(posArr.getZ(vtx))) < 0.26);
    carvingUVs.setXY(
      vtx,
      isPlainTop || isInsideCup ? 0.025 : perimeterU,
      isPlainTop || isInsideCup ? 0.025 : posArr.getY(vtx) / hgt + 0.5,
    );
    uvs.setXY(vtx, u * 0.48 + offsetU, v * 0.48 + offsetV);
  }
  if (!traits.isRound) {
    for (let vtx: number = 0; vtx < carvingUVs.count; vtx += 3) {
      const vals: number[] = [0, 1, 2].map((ofs: number): number => carvingUVs.getX(vtx + ofs));
      const isPlainFace: boolean = [0, 1, 2].some(
        (ofs: number): boolean => Math.abs(carvingUVs.getY(vtx + ofs) - 0.025) < 0.0001,
      );
      if (!isPlainFace && Math.max(...vals) - Math.min(...vals) > 0.5) {
        for (let ofs: number = 0; ofs < 3; ofs += 1) {
          const u: number | undefined = vals[ofs];
          if (u !== undefined && u < 0.5) carvingUVs.setX(vtx + ofs, u + 1);
        }
      }
    }
  }
  geom.setAttribute("uv1", carvingUVs);
  geom.setAttribute(
    "naturePieceHeight",
    new Float32BufferAttribute(new Float32Array(posArr.count).fill(hgt), 1),
  );
}
