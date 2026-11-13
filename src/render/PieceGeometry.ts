import {
  type BufferAttribute,
  type BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
  type InterleavedBufferAttribute,
  LatheGeometry,
  Path,
  Shape,
  SphereGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { PieceTraits } from "../game/pieces";
import type { PieceId } from "../game/types";
import { createHollowSquare, squarePath } from "./geometry";
import { squareCarvingU } from "./natureCarving";
import type { SceneResources } from "./SceneResources";
import { createVictorianRoundGeometry, createVictorianSquareGeometry } from "./victorianCraft";

export class PieceGeometry {
  readonly riceGrainGeometry: SphereGeometry = new SphereGeometry(1, 6, 4);
  private readonly marbleBodyGeometries = new Map<PieceId, BufferGeometry>();
  private readonly victorianBodyGeometries = new Map<PieceId, BufferGeometry>();
  private readonly coffeeBodyGeometries = new Map<PieceId, BufferGeometry>();
  private readonly quakeBodyGeometries = new Map<PieceId, BufferGeometry>();
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

  private readonly marblePieceGeometries = {
    smallRound: this.createStoneCylinder(0.9),
    bigRound: this.createStoneCylinder(1.45),
    hollowSmallRound: this.createStoneCylinder(0.9, true),
    hollowBigRound: this.createStoneCylinder(1.45, true),
    smallSquare: new RoundedBoxGeometry(0.74, 0.9, 0.74, 4, 0.045),
    bigSquare: new RoundedBoxGeometry(0.74, 1.45, 0.74, 4, 0.045),
    hollowSmallSquare: createHollowSquare(0.9),
    hollowBigSquare: createHollowSquare(1.45),
  } as const;

  constructor(private readonly resMap: SceneResources) {
    for (const geom of [
      this.riceGrainGeometry,
      ...Object.values(this.marblePieceGeometries),
      ...Object.values(this.victorianRoundGeometries),
      ...Object.values(this.victorianSquareGeometries),
    ])
      resMap.track(geom);
  }

  private createStoneCylinder(hgt: number, hollow = false): LatheGeometry {
    const geom = new LatheGeometry(
      [
        new Vector2(0, 0),
        new Vector2(0.39, 0),
        new Vector2(0.415, 0.008),
        new Vector2(0.428, 0.023),
        new Vector2(0.43, 0.045),
        new Vector2(0.382, hgt - 0.045),
        new Vector2(0.378, hgt - 0.023),
        new Vector2(0.365, hgt - 0.008),
        new Vector2(0.342, hgt),
        ...(hollow
          ? [
              new Vector2(0.22, hgt),
              new Vector2(0.205, hgt - 0.012),
              new Vector2(0.205, hgt - 0.12),
              new Vector2(0, hgt - 0.12),
            ]
          : [new Vector2(0, hgt)]),
      ],
      64,
    );
    geom.translate(0, -hgt / 2, 0);
    return geom;
  }

  createSquareBezel(): ExtrudeGeometry {
    const shape: Shape = squarePath(new Shape(), 0.225, 0.025);
    shape.holes.push(squarePath(new Path(), 0.205, 0.023));
    const geom = new ExtrudeGeometry(shape, {
      depth: 0.012,
      bevelEnabled: false,
      curveSegments: 8,
    });
    geom.rotateX(-Math.PI / 2);
    return geom;
  }

  getMarbleBodyGeometry(pc: PieceId, traits: PieceTraits): BufferGeometry {
    const cache: BufferGeometry | undefined = this.marbleBodyGeometries.get(pc);
    if (cache) return cache;
    const src: BufferGeometry = traits.isRound
      ? traits.isSolid
        ? traits.isBig
          ? this.marblePieceGeometries.bigRound
          : this.marblePieceGeometries.smallRound
        : traits.isBig
          ? this.marblePieceGeometries.hollowBigRound
          : this.marblePieceGeometries.hollowSmallRound
      : traits.isSolid
        ? traits.isBig
          ? this.marblePieceGeometries.bigSquare
          : this.marblePieceGeometries.smallSquare
        : traits.isBig
          ? this.marblePieceGeometries.hollowBigSquare
          : this.marblePieceGeometries.hollowSmallSquare;
    const geom: BufferGeometry = !traits.isRound && src.index ? src.toNonIndexed() : src.clone();
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
    this.marbleBodyGeometries.set(pc, geom);
    return this.resMap.track(geom);
  }

  getQuakeBodyGeometry(pc: PieceId, traits: PieceTraits): BufferGeometry {
    const cached: BufferGeometry | undefined = this.quakeBodyGeometries.get(pc);
    if (cached) return cached;
    const geom: BufferGeometry = this.getMarbleBodyGeometry(pc, traits).clone();
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
    this.quakeBodyGeometries.set(pc, geom);
    return this.resMap.track(geom);
  }

  getCoffeeBodyGeometry(pc: PieceId, traits: PieceTraits): BufferGeometry {
    const cache: BufferGeometry | undefined = this.coffeeBodyGeometries.get(pc);
    if (cache) return cache;
    const geom: BufferGeometry = this.getMarbleBodyGeometry(pc, traits).clone();
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
    this.coffeeBodyGeometries.set(pc, geom);
    return this.resMap.track(geom);
  }

  getVictorianBodyGeometry(pc: PieceId, traits: PieceTraits): BufferGeometry {
    const cache: BufferGeometry | undefined = this.victorianBodyGeometries.get(pc);
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
    this.victorianBodyGeometries.set(pc, geom);
    return this.resMap.track(geom);
  }
}
