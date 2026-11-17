import {
  type BufferGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Path,
  Shape,
  SphereGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { PieceTraits } from "../game/pieces";
import type { PcId } from "../game/types";
import { FlogstaPieceGeometry } from "./flogsta/flogstaPieceGeometry";
import { createHollowSquare, squarePath } from "./geometry";
import { applyNaturePieceUv } from "./nature/naturePieceUv";
import { QuakePieceGeometry } from "./quake/quakePieceGeometry";
import type { SceneResources } from "./SceneResources";
import { VictorianPieceGeometry } from "./victorian/victorianPieceGeometry";

export class PieceGeometry {
  readonly riceGrainGeometry: SphereGeometry = new SphereGeometry(1, 6, 4);
  private readonly marbleBodyGeometries = new Map<PcId, BufferGeometry>();
  private readonly quakePieces: QuakePieceGeometry;
  private readonly flogstaPieces: FlogstaPieceGeometry;
  private readonly victorianPieces: VictorianPieceGeometry;
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
    this.quakePieces = new QuakePieceGeometry(resMap);
    this.flogstaPieces = new FlogstaPieceGeometry(resMap);
    this.victorianPieces = new VictorianPieceGeometry(resMap);
    for (const geom of [this.riceGrainGeometry, ...Object.values(this.marblePieceGeometries)])
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

  getMarbleBodyGeometry(pc: PcId, traits: PieceTraits): BufferGeometry {
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
    applyNaturePieceUv(geom, pc, traits);
    this.marbleBodyGeometries.set(pc, geom);
    return this.resMap.track(geom);
  }

  getQuakeBodyGeometry(pc: PcId, traits: PieceTraits): BufferGeometry {
    return this.quakePieces.get(pc, traits, this.getMarbleBodyGeometry(pc, traits));
  }

  getCoffeeBodyGeometry(pc: PcId, traits: PieceTraits): BufferGeometry {
    return this.flogstaPieces.get(pc, traits, this.getMarbleBodyGeometry(pc, traits));
  }

  getVictorianBodyGeometry(pc: PcId, traits: PieceTraits): BufferGeometry {
    return this.victorianPieces.get(pc, traits);
  }
}
