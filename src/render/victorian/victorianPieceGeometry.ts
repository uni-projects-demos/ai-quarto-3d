import type { BufferAttribute, BufferGeometry, InterleavedBufferAttribute } from "three";
import type { PieceTraits } from "../../game/pieces";
import type { PcId } from "../../game/types";
import type { SceneResources } from "../SceneResources";
import { createVictorianRoundGeometry, createVictorianSquareGeometry } from "./victorianCraft";

export class VictorianPieceGeometry {
  private readonly cache = new Map<PcId, BufferGeometry>();
  private readonly victorianRoundGeometries = {
    small: createVictorianRoundGeometry(0.9, false),
    big: createVictorianRoundGeometry(1.45, false),
    hollowSmall: createVictorianRoundGeometry(0.9, true),
    hollowBig: createVictorianRoundGeometry(1.45, true),
  } as const;
  private readonly victorianSquareGeometries = {
    small: createVictorianSquareGeometry(0.9, false),
    big: createVictorianSquareGeometry(1.45, false),
    hollowSmall: createVictorianSquareGeometry(0.9, true),
    hollowBig: createVictorianSquareGeometry(1.45, true),
  } as const;

  constructor(private readonly resMap: SceneResources) {
    for (const geom of [
      ...Object.values(this.victorianRoundGeometries),
      ...Object.values(this.victorianSquareGeometries),
    ])
      resMap.track(geom);
  }

  get(pc: PcId, traits: PieceTraits): BufferGeometry {
    const cache: BufferGeometry | undefined = this.cache.get(pc);
    if (cache) return cache;
    let src: BufferGeometry;
    if (traits.isRound) {
      src = traits.isSolid
        ? traits.isBig
          ? this.victorianRoundGeometries.big
          : this.victorianRoundGeometries.small
        : traits.isBig
          ? this.victorianRoundGeometries.hollowBig
          : this.victorianRoundGeometries.hollowSmall;
    } else {
      src = traits.isSolid
        ? traits.isBig
          ? this.victorianSquareGeometries.big
          : this.victorianSquareGeometries.small
        : traits.isBig
          ? this.victorianSquareGeometries.hollowBig
          : this.victorianSquareGeometries.hollowSmall;
    }
    const geom: BufferGeometry = src.clone();
    const posArr: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("position");
    const normals: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("normal");
    const uvs: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("uv");
    const hgt: 0.9 | 1.45 = traits.isBig ? 1.45 : 0.9;
    const offsetU: number = ((pc * 7 + 2) % 17) / 35;
    const offsetV: number = ((pc * 11 + 3) % 19) / 39;
    for (let vtx: number = 0; vtx < posArr.count; vtx += 1) {
      let u: number = uvs.getX(vtx);
      let v: number = posArr.getY(vtx) / hgt + 0.5;
      if (Math.abs(normals.getY(vtx)) > 0.95) {
        u = posArr.getX(vtx) / 0.88 + 0.5;
        v = posArr.getZ(vtx) / 0.88 + 0.5;
      } else if (!traits.isRound) {
        u =
          (Math.abs(normals.getX(vtx)) > Math.abs(normals.getZ(vtx))
            ? posArr.getZ(vtx)
            : posArr.getX(vtx)) /
            0.74 +
          0.5;
      }
      uvs.setXY(vtx, u * 0.46 + offsetU, v * 0.46 + offsetV);
    }
    this.cache.set(pc, geom);
    return this.resMap.track(geom);
  }
}
