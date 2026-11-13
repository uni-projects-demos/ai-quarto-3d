import {
  CatmullRomCurve3,
  Group,
  Mesh,
  MeshBasicMaterial,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import type { PieceTraits } from "../game/pieces";

export function createQuakePieceDetails(traits: PieceTraits, pc: number): Group {
  const group = new Group();
  group.visible = false;
  const hgt: 0.9 | 1.45 = traits.isBig ? 1.45 : 0.9;

  if (traits.isRound) {
    const seam = new MeshBasicMaterial({ color: 0x4c3627, transparent: true, opacity: 0.3 });
    const highlight = new MeshBasicMaterial({ color: 0xe7d2aa, transparent: true, opacity: 0.2 });
    const ringCount: 9 | 15 = traits.isBig ? 15 : 9;
    for (let i: number = 1; i <= ringCount; i += 1) {
      const y: number = i * (hgt / (ringCount + 1));
      const radius: number = 0.426 - 0.055 * (y / hgt) + 0.001;
      const ring = new Mesh(
        new TorusGeometry(radius, 0.0021, 3, 42),
        i % 4 === 0 ? highlight : seam,
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      ring.raycast = (): void => {};
      group.add(ring);
    }

    const pts: Vector3[] = [];
    for (let i: number = 0; i <= 9; i += 1) {
      const level: number = i / 9;
      const x: number = 0.18 + 0.012 * Math.sin(level * 9 + pc);
      const radius: number = 0.427 - 0.055 * level;
      pts.push(
        new Vector3(
          x,
          0.045 + level * (hgt - 0.09),
          Math.sqrt(Math.max(0, radius ** 2 - x ** 2)) + 0.005,
        ),
      );
    }
    const join = new Mesh(new TubeGeometry(new CatmullRomCurve3(pts), 24, 0.0034, 4), seam);
    join.raycast = (): void => {};
    group.add(join);
    return group;
  }

  const crack = new MeshBasicMaterial({ color: 0x49271c, transparent: true, opacity: 0.6 });
  const exposedClay = new MeshBasicMaterial({ color: 0xe6bf98, transparent: true, opacity: 0.4 });
  const count: 4 | 5 = traits.isBig ? 5 : 4;
  for (let i: number = 0; i < count; i += 1) {
    const x: number = -0.23 + i * (0.46 / Math.max(1, count - 1));
    const jitter: number = Math.sin(pc * 5.37 + i * 3.14) * 0.027;
    const y0: number = hgt * 0.15 + jitter;
    const y1: number = hgt * (traits.isBig ? 0.88 : 0.8) - jitter;
    const pts: Vector3[] = [
      new Vector3(x - 0.032, y0, 0.381),
      new Vector3(x + jitter + 0.023, (y0 + y1) * 0.43, 0.389),
      new Vector3(x - jitter * 0.7 - 0.026, (y0 + y1) * 0.66, 0.386),
      new Vector3(x + 0.045, y1, 0.379),
    ];
    const fissure = new Mesh(
      new TubeGeometry(new CatmullRomCurve3(pts), 12, i % 2 === 0 ? 0.008 : 0.005, 4),
      i % 3 === 0 ? exposedClay : crack,
    );
    fissure.raycast = (): void => {};
    group.add(fissure);
  }
  return group;
}
