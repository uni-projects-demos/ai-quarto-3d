import { BoxGeometry, type BufferGeometry, ExtrudeGeometry, Path, Shape } from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export function squarePath<T extends Path>(path: T, half: number, radius: number): T {
  path.moveTo(-half + radius, -half);
  path.lineTo(half - radius, -half);
  path.quadraticCurveTo(half, -half, half, -half + radius);
  path.lineTo(half, half - radius);
  path.quadraticCurveTo(half, half, half - radius, half);
  path.lineTo(-half + radius, half);
  path.quadraticCurveTo(-half, half, -half, half - radius);
  path.lineTo(-half, -half + radius);
  path.quadraticCurveTo(-half, -half, -half + radius, -half);
  path.closePath();
  return path;
}

export function createHollowSquare(
  height: number,
  rounded = true,
  style: "marble" | "victorian" = "marble",
): BufferGeometry {
  const victorian = style === "victorian";
  const radius = victorian ? 0.018 : rounded ? 0.045 : 0.004;
  const shape = squarePath(new Shape(), 0.37, radius);
  shape.holes.push(squarePath(new Path(), 0.205, 0.023));
  const lip = new ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false, curveSegments: 8 });
  lip.rotateX(-Math.PI / 2);
  lip.translate(0, height / 2 - 0.12, 0);
  const base = rounded
    ? new RoundedBoxGeometry(0.74, height - 0.12, 0.74, victorian ? 3 : 4, radius)
    : new BoxGeometry(0.74, height - 0.12, 0.74).toNonIndexed();
  base.translate(0, -0.06, 0);
  const merged = mergeGeometries([base, lip], false);
  base.dispose();
  lip.dispose();
  if (!merged) throw new Error("Could not create recessed square piece");
  return merged;
}
