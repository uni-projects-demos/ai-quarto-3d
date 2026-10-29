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

  constructor(private readonly resources: SceneResources) {
    for (const geometry of [
      this.riceGrainGeometry,
      ...Object.values(this.marblePieceGeometries),
      ...Object.values(this.victorianRoundGeometries),
      ...Object.values(this.victorianSquareGeometries),
    ])
      resources.track(geometry);
  }

  private createStoneCylinder(height: number, hollow = false): LatheGeometry {
    const geometry = new LatheGeometry(
      [
        new Vector2(0, 0),
        new Vector2(0.39, 0),
        new Vector2(0.415, 0.008),
        new Vector2(0.428, 0.023),
        new Vector2(0.43, 0.045),
        new Vector2(0.382, height - 0.045),
        new Vector2(0.378, height - 0.023),
        new Vector2(0.365, height - 0.008),
        new Vector2(0.342, height),
        ...(hollow
          ? [
              new Vector2(0.22, height),
              new Vector2(0.205, height - 0.012),
              new Vector2(0.205, height - 0.12),
              new Vector2(0, height - 0.12),
            ]
          : [new Vector2(0, height)]),
      ],
      64,
    );
    geometry.translate(0, -height / 2, 0);
    return geometry;
  }

  createSquareBezel(): ExtrudeGeometry {
    const shape = squarePath(new Shape(), 0.225, 0.025);
    shape.holes.push(squarePath(new Path(), 0.205, 0.023));
    const geometry = new ExtrudeGeometry(shape, {
      depth: 0.012,
      bevelEnabled: false,
      curveSegments: 8,
    });
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }

  getMarbleBodyGeometry(piece: PieceId, traits: PieceTraits): BufferGeometry {
    const cached = this.marbleBodyGeometries.get(piece);
    if (cached) return cached;
    const source = traits.isRound
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
    const geometry = !traits.isRound && source.index ? source.toNonIndexed() : source.clone();
    const uvs = geometry.getAttribute("uv");
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const carvingUVs = uvs.clone();
    const height: number = traits.isBig ? 1.45 : 0.9;
    const offsetU: number = ((piece * 7 + 3) % 17) / 34;
    const offsetV: number = ((piece * 11 + 5) % 19) / 38;
    for (let vertex: number = 0; vertex < uvs.count; vertex += 1) {
      const perimeterU = traits.isRound
        ? uvs.getX(vertex) + 0.125
        : squareCarvingU(positions.getX(vertex), positions.getZ(vertex));
      let u: number = uvs.getX(vertex);
      let v: number = traits.isRound ? positions.getY(vertex) / height + 0.5 : uvs.getY(vertex);
      if (Math.abs(normals.getY(vertex)) > 0.95) {
        const width: number = traits.isRound ? 0.86 : 0.74;
        u = positions.getX(vertex) / width + 0.5;
        v = positions.getZ(vertex) / width + 0.5;
      } else if (!traits.isRound) {
        u =
          (Math.abs(normals.getX(vertex)) > Math.abs(normals.getZ(vertex))
            ? positions.getZ(vertex)
            : positions.getX(vertex)) /
            0.74 +
          0.5;
        v = positions.getY(vertex) / height + 0.5;
      }
      const plainTop: boolean = normals.getY(vertex) > 0.65 && positions.getY(vertex) > 0;
      const insideCup: boolean =
        !traits.isSolid &&
        positions.getY(vertex) > height / 2 - 0.14 &&
        (traits.isRound
          ? Math.hypot(positions.getX(vertex), positions.getZ(vertex)) < 0.29
          : Math.max(Math.abs(positions.getX(vertex)), Math.abs(positions.getZ(vertex))) < 0.26);
      carvingUVs.setXY(
        vertex,
        plainTop || insideCup ? 0.025 : perimeterU,
        plainTop || insideCup ? 0.025 : positions.getY(vertex) / height + 0.5,
      );
      uvs.setXY(vertex, u * 0.48 + offsetU, v * 0.48 + offsetV);
    }
    if (!traits.isRound) {
      for (let vertex = 0; vertex < carvingUVs.count; vertex += 3) {
        const vals = [0, 1, 2].map((offset) => carvingUVs.getX(vertex + offset));
        const plainFace = [0, 1, 2].some(
          (offset) => Math.abs(carvingUVs.getY(vertex + offset) - 0.025) < 0.0001,
        );
        if (!plainFace && Math.max(...vals) - Math.min(...vals) > 0.5) {
          for (let offset = 0; offset < 3; offset += 1) {
            const u = vals[offset];
            if (u !== undefined && u < 0.5) carvingUVs.setX(vertex + offset, u + 1);
          }
        }
      }
    }
    geometry.setAttribute("uv1", carvingUVs);
    geometry.setAttribute(
      "naturePieceHeight",
      new Float32BufferAttribute(new Float32Array(positions.count).fill(height), 1),
    );
    this.marbleBodyGeometries.set(piece, geometry);
    return this.resources.track(geometry);
  }

  getCoffeeBodyGeometry(piece: PieceId, traits: PieceTraits): BufferGeometry {
    const cached = this.coffeeBodyGeometries.get(piece);
    if (cached) return cached;
    const geom = this.getMarbleBodyGeometry(piece, traits).clone();
    const pos = geom.getAttribute("position");
    const height = traits.isBig ? 1.45 : 0.9;
    for (let vertex = 0; vertex < pos.count; vertex += 1) {
      const progress = pos.getY(vertex) / height + 0.5;
      const scale = traits.isRound
        ? (0.29 + 0.085 * progress) / (0.43 - 0.05 * progress)
        : 0.82 + 0.16 * progress;
      pos.setXYZ(
        vertex,
        pos.getX(vertex) * scale,
        0.06 + progress * (height - 0.18) - height / 2,
        pos.getZ(vertex) * scale,
      );
    }
    geom.computeVertexNormals();
    geom.computeBoundingBox();
    geom.computeBoundingSphere();
    this.coffeeBodyGeometries.set(piece, geom);
    return this.resources.track(geom);
  }

  getVictorianBodyGeometry(piece: PieceId, traits: PieceTraits): BufferGeometry {
    const cached = this.victorianBodyGeometries.get(piece);
    if (cached) return cached;
    let source: BufferGeometry;
    if (traits.isRound) {
      source = traits.isSolid
        ? traits.isBig
          ? this.victorianRoundGeometries.big
          : this.victorianRoundGeometries.small
        : traits.isBig
          ? this.victorianRoundGeometries.hollowBig
          : this.victorianRoundGeometries.hollowSmall;
    } else {
      source = traits.isSolid
        ? traits.isBig
          ? this.victorianSquareGeometries.big
          : this.victorianSquareGeometries.small
        : traits.isBig
          ? this.victorianSquareGeometries.hollowBig
          : this.victorianSquareGeometries.hollowSmall;
    }
    const geometry = source.clone();
    const positions = geometry.getAttribute("position");
    const normals = geometry.getAttribute("normal");
    const uvs = geometry.getAttribute("uv");
    const height = traits.isBig ? 1.45 : 0.9;
    const offsetU = ((piece * 7 + 2) % 17) / 35;
    const offsetV = ((piece * 11 + 3) % 19) / 39;
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      let u = uvs.getX(vertex);
      let v = positions.getY(vertex) / height + 0.5;
      if (Math.abs(normals.getY(vertex)) > 0.95) {
        u = positions.getX(vertex) / 0.88 + 0.5;
        v = positions.getZ(vertex) / 0.88 + 0.5;
      } else if (!traits.isRound) {
        u =
          (Math.abs(normals.getX(vertex)) > Math.abs(normals.getZ(vertex))
            ? positions.getZ(vertex)
            : positions.getX(vertex)) /
            0.74 +
          0.5;
      }
      uvs.setXY(vertex, u * 0.46 + offsetU, v * 0.46 + offsetV);
    }
    this.victorianBodyGeometries.set(piece, geometry);
    return this.resources.track(geometry);
  }
}
