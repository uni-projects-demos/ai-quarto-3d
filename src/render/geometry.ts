import { BoxGeometry, type BufferGeometry, ExtrudeGeometry, Path, Shape } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function squarePath<T extends Path>(pth: T, half: number, rad: number): T {
  pth.moveTo(-half + rad, -half);
  pth.lineTo(half - rad, -half);
  pth.quadraticCurveTo(half, -half, half, -half + rad);
  pth.lineTo(half, half - rad);
  pth.quadraticCurveTo(half, half, half - rad, half);
  pth.lineTo(-half + rad, half);
  pth.quadraticCurveTo(-half, half, -half, half - rad);
  pth.lineTo(-half, -half + rad);
  pth.quadraticCurveTo(-half, -half, -half + rad, -half);
  pth.closePath();
  return pth;
}

export function createHollowSquare(
  hgt: number,
  rounded = true,
  sty: "marble" | "victorian" = "marble",
): BufferGeometry {
  const isVictorian: boolean = sty === "victorian";
  const rad: 0.004 | 0.018 | 0.045 = isVictorian ? 0.018 : rounded ? 0.045 : 0.004;
  const shape: Shape = squarePath(new Shape(), 0.37, rad);
  shape.holes.push(squarePath(new Path(), 0.205, 0.023));
  const lip = new ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, curveSegments: 8 });
  lip.rotateX(-Math.PI / 2);
  lip.translate(0, hgt / 2 - 0.12, 0);
  const base: BufferGeometry = rounded
    ? new RoundedBoxGeometry(0.74, hgt - 0.12, 0.74, isVictorian ? 3 : 4, rad)
    : new BoxGeometry(0.74, hgt - 0.12, 0.74).toNonIndexed();
  base.translate(0, -0.06, 0);
  const merged: BufferGeometry = mergeGeometries([base, lip], false);
  base.dispose();
  lip.dispose();
  if (!merged) throw new Error("Could not create recessed square piece");
  return merged;
}
