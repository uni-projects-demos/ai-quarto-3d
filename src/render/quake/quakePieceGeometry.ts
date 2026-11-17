import type { BufferAttribute, BufferGeometry, InterleavedBufferAttribute } from "three";
import type { PieceTraits } from "../../game/pieces";
import type { PcId } from "../../game/types";
import type { SceneResources } from "../SceneResources";

export class QuakePieceGeometry {
  private readonly cache = new Map<PcId, BufferGeometry>();

  constructor(private readonly resMap: SceneResources) {}

  get(pc: PcId, traits: PieceTraits, src: BufferGeometry): BufferGeometry {
    const cached: BufferGeometry | undefined = this.cache.get(pc);
    if (cached) return cached;
    const geom: BufferGeometry = src.clone();
    const pos: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("position");
    const hgt: 0.9 | 1.45 = traits.isBig ? 1.45 : 0.9;
    const tilt: number =
      Math.sin(pc * 13.73 + 1.2) * (traits.isRound ? 0.009 : traits.isBig ? 0.016 : 0.035);
    for (let i: number = 0; i < pos.count; i += 1) {
      const x: number = pos.getX(i);
      const y: number = pos.getY(i);
      const z: number = pos.getZ(i);
      const angle: number = Math.atan2(z, x);
      const level: number = y / hgt + 0.5;
      const radius: number = Math.hypot(x, z);
      const exterior: number = Math.min(1, Math.max(0, (radius - 0.25) / 0.12));
      if (traits.isRound) {
        const paperWrinkle: number =
          0.006 * Math.sin(angle * 8 + pc) * Math.sin(level * 23 + pc * 1.2);
        const roughCut: number =
          exterior *
          Math.max(0, (level - 0.97) / 0.03) *
          (0.005 + 0.006 * Math.max(0, Math.sin(angle * 19 + pc * 3)));
        pos.setXYZ(i, x * (1 + paperWrinkle) + tilt * level, y - roughCut, z * (1 + paperWrinkle));
      } else {
        const fracture: number =
          Math.max(0, Math.sin(angle * 5 + pc * 1.17)) ** 5 *
          Math.max(0, Math.sin(level * 13 + pc * 2.47)) ** 2;
        const waviness: number =
          Math.sin(angle * 11 + pc * 0.8 + level * 7) *
          Math.sin(level * 17 - angle * 3 + pc) *
          0.015;
        const edgeScale: number =
          1 + exterior * (waviness - fracture * (traits.isBig ? 0.085 : 0.12));
        const topChip: number =
          exterior *
          Math.max(0, (level - 0.86) / 0.14) *
          (0.023 + 0.088 * Math.max(0, Math.sin(angle * 6 + pc * 1.23)) ** 7);
        pos.setXYZ(i, x * edgeScale + tilt * (level - 0.2), y - topChip, z * edgeScale);
      }
    }
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    this.cache.set(pc, geom);
    return this.resMap.track(geom);
  }
}
