import type { BufferAttribute, BufferGeometry, InterleavedBufferAttribute } from "three";
import type { PieceTraits } from "../../game/pieces";
import type { PcId } from "../../game/types";
import type { SceneResources } from "../SceneResources";

export class FlogstaPieceGeometry {
  private readonly cache = new Map<PcId, BufferGeometry>();

  constructor(private readonly resMap: SceneResources) {}

  get(pc: PcId, traits: PieceTraits, src: BufferGeometry): BufferGeometry {
    const cache: BufferGeometry | undefined = this.cache.get(pc);
    if (cache) return cache;
    const geom: BufferGeometry = src.clone();
    const pos: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("position");
    const hgt: 0.9 | 1.45 = traits.isBig ? 1.45 : 0.9;
    for (let vtx: number = 0; vtx < pos.count; vtx += 1) {
      const prog: number = pos.getY(vtx) / hgt + 0.5;
      const scale: number = traits.isRound
        ? (0.29 + 0.085 * prog) / (0.43 - 0.05 * prog)
        : 0.82 + 0.16 * prog;
      pos.setXYZ(
        vtx,
        pos.getX(vtx) * scale,
        0.06 + prog * (hgt - 0.18) - hgt / 2,
        pos.getZ(vtx) * scale,
      );
    }
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    this.cache.set(pc, geom);
    return this.resMap.track(geom);
  }
}
