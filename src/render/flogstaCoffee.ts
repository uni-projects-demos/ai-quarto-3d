import {
  BoxGeometry,
  type BufferGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  Mesh,
  type MeshPhysicalMaterial,
  Path,
  RingGeometry,
  Shape,
  ShapeGeometry,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PieceTraits } from "../game/pieces";
import { squarePath } from "./geometry";

export interface CoffeeMaterials {
  glass: MeshPhysicalMaterial;
  surface: MeshPhysicalMaterial;
  bubble: MeshPhysicalMaterial;
  sugar: MeshPhysicalMaterial;
}

export function createSugarTexture(): CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create brown sugar texture");
  const img = context.createImageData(size, size);
  const colour = [186, 126, 67] as const;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const crystal = Math.sin(Math.floor(x / 3) * 91.7 + Math.floor(y / 3) * 73.1);
      const facet = ((x % 3) - (y % 3)) * 6;
      const tone = crystal * 29 + facet + (Math.random() - 0.5) * 12;
      const pixel = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        img.data[pixel + channel] = (colour[channel] ?? 0) + tone;
      }
      img.data[pixel + 3] = 255;
    }
  }
  context.putImageData(img, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function createGlassGeom(height: number, isRound: boolean): BufferGeometry {
  if (isRound) {
    return new LatheGeometry(
      [
        new Vector2(0, 0),
        new Vector2(0.3, 0),
        new Vector2(0.325, 0.02),
        new Vector2(0.405, height - 0.018),
        new Vector2(0.403, height),
        new Vector2(0.386, height),
        new Vector2(0.388, height - 0.018),
        new Vector2(0.308, 0.07),
        new Vector2(0, 0.055),
      ],
      64,
    );
  }
  const wall = squarePath(new Shape(), 0.405, 0.035);
  wall.holes.push(squarePath(new Path(), 0.385, 0.025));
  const walls = new ExtrudeGeometry(wall, {
    depth: height - 0.055,
    bevelEnabled: false,
    curveSegments: 8,
  });
  walls.rotateX(-Math.PI / 2);
  walls.translate(0, 0.055, 0);
  const pos = walls.getAttribute("position");
  for (let vertex = 0; vertex < pos.count; vertex += 1) {
    const scale = 0.81 + (pos.getY(vertex) / height) * 0.19;
    pos.setXYZ(vertex, pos.getX(vertex) * scale, pos.getY(vertex), pos.getZ(vertex) * scale);
  }
  walls.computeVertexNormals();
  const base = new BoxGeometry(0.665, 0.055, 0.665).toNonIndexed();
  base.translate(0, 0.0275, 0);
  const geometry = mergeGeometries([base, walls], false);
  base.dispose();
  walls.dispose();
  if (!geometry) throw new Error("Could not create square coffee glass");
  return geometry;
}

export function createCoffeeDetails(traits: PieceTraits, materials: CoffeeMaterials): Group {
  const details = new Group();
  details.name = "coffee-glass";
  details.visible = false;
  const height = traits.isBig ? 1.45 : 0.9;
  const glass = new Mesh(createGlassGeom(height, traits.isRound), materials.glass);
  glass.name = "glass-shell";
  const rayCast = glass.raycast.bind(glass);
  glass.raycast = (ray, hits): void => {
    if (details.visible) rayCast(ray, hits);
  };
  const shape = squarePath(new Shape(), 0.375, 0.03);
  if (!traits.isSolid) shape.holes.push(squarePath(new Path(), 0.205, 0.023));
  const surface = new Mesh(
    traits.isRound
      ? new RingGeometry(traits.isSolid ? 0 : 0.205, 0.375, 64)
      : new ShapeGeometry(shape, 8),
    materials.surface,
  );
  surface.name = "coffee-surface";
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = height - 0.12;
  surface.receiveShadow = true;
  surface.raycast = (): void => {};
  if (!traits.isSolid) {
    const sugar = new Mesh(new RoundedBoxGeometry(0.24, 0.24, 0.24, 2, 0.012), materials.sugar);
    sugar.name = "brown-sugar-cube";
    sugar.position.y = height - 0.126;
    sugar.rotation.y = traits.isRound ? 0.3 : -0.18;
    sugar.castShadow = true;
    sugar.receiveShadow = true;
    sugar.raycast = (): void => {};
    details.add(sugar);
  }
  const bubbleGeometry = new SphereGeometry(0.012, 8, 6);
  for (let idx = 0; idx < 5; idx += 1) {
    const angle = idx * 0.19 + (traits.isBig ? 0.7 : 2.1);
    const bubble = new Mesh(bubbleGeometry, materials.bubble);
    bubble.position.set(Math.cos(angle) * 0.32, height - 0.118, Math.sin(angle) * 0.32);
    bubble.scale.set(1, 0.22, 1);
    bubble.raycast = (): void => {};
    details.add(bubble);
  }
  details.add(glass, surface);
  return details;
}
