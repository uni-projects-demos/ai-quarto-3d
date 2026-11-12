import {
  type BufferGeometry,
  ExtrudeGeometry,
  Float32BufferAttribute,
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
  readonly riceGrainGeometry = new SphereGeometry(1, 6, 4);
  private readonly marbleBodyGeometries = new Map<PieceId, BufferGeometry>();
  private readonly victorianBodyGeometries = new Map<PieceId, BufferGeometry>();
  private readonly coffeeBodyGeometries = new Map<PieceId, BufferGeometry>();
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
    const shape = squarePath(new Shape(), 0.225, 0.025);
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
    const cache = this.marbleBodyGeometries.get(pc);
    if (cache) return cache;
    const src = traits.isRound
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
    const geom = !traits.isRound && src.index ? src.toNonIndexed() : src.clone();
    const uvs = geom.getAttribute("uv");
    const posArr = geom.getAttribute("position");
    const normals = geom.getAttribute("normal");
    const carvingUVs = uvs.clone();
    const hgt: number = traits.isBig ? 1.45 : 0.9;
    const offsetU: number = ((pc * 7 + 3) % 17) / 34;
    const offsetV: number = ((pc * 11 + 5) % 19) / 38;
    for (let vtx: number = 0; vtx < uvs.count; vtx += 1) {
      const perimeterU = traits.isRound
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
      const plainTop: boolean = normals.getY(vtx) > 0.65 && posArr.getY(vtx) > 0;
      const insideCup: boolean =
        !traits.isSolid &&
        posArr.getY(vtx) > hgt / 2 - 0.14 &&
        (traits.isRound
          ? Math.hypot(posArr.getX(vtx), posArr.getZ(vtx)) < 0.29
          : Math.max(Math.abs(posArr.getX(vtx)), Math.abs(posArr.getZ(vtx))) < 0.26);
      carvingUVs.setXY(
        vtx,
        plainTop || insideCup ? 0.025 : perimeterU,
        plainTop || insideCup ? 0.025 : posArr.getY(vtx) / hgt + 0.5,
      );
      uvs.setXY(vtx, u * 0.48 + offsetU, v * 0.48 + offsetV);
    }
    if (!traits.isRound) {
      for (let vtx = 0; vtx < carvingUVs.count; vtx += 3) {
        const vals = [0, 1, 2].map((ofs) => carvingUVs.getX(vtx + ofs));
        const plainFace = [0, 1, 2].some(
          (ofs) => Math.abs(carvingUVs.getY(vtx + ofs) - 0.025) < 0.0001,
        );
        if (!plainFace && Math.max(...vals) - Math.min(...vals) > 0.5) {
          for (let ofs = 0; ofs < 3; ofs += 1) {
            const u = vals[ofs];
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

  getCoffeeBodyGeometry(pc: PieceId, traits: PieceTraits): BufferGeometry {
    const cache = this.coffeeBodyGeometries.get(pc);
    if (cache) return cache;
    const geom = this.getMarbleBodyGeometry(pc, traits).clone();
    const pos = geom.getAttribute("position");
    const hgt = traits.isBig ? 1.45 : 0.9;
    for (let vtx = 0; vtx < pos.count; vtx += 1) {
      const prog = pos.getY(vtx) / hgt + 0.5;
      const scale = traits.isRound
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
    const cache = this.victorianBodyGeometries.get(pc);
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
    const geom = src.clone();
    const posArr = geom.getAttribute("position");
    const normals = geom.getAttribute("normal");
    const uvs = geom.getAttribute("uv");
    const hgt = traits.isBig ? 1.45 : 0.9;
    const offsetU = ((pc * 7 + 2) % 17) / 35;
    const offsetV = ((pc * 11 + 3) % 19) / 39;
    for (let vtx = 0; vtx < posArr.count; vtx += 1) {
      let u = uvs.getX(vtx);
      let v = posArr.getY(vtx) / hgt + 0.5;
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
