import {
  BoxGeometry,
  type BufferAttribute,
  type BufferGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Group,
  type InterleavedBufferAttribute,
  type Intersection,
  LatheGeometry,
  Mesh,
  type MeshPhysicalMaterial,
  type Object3D,
  type Object3DEventMap,
  Path,
  type Raycaster,
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
  const cvs: HTMLCanvasElement = document.createElement("canvas");
  cvs.width = size;
  cvs.height = size;
  const ctx: CanvasRenderingContext2D | null = cvs.getContext("2d");
  if (!ctx) throw new Error("Could not create brown sugar texture");
  const img: ImageData = ctx.createImageData(size, size);
  const col = [186, 126, 67] as const;
  for (let y: number = 0; y < size; y += 1) {
    for (let x: number = 0; x < size; x += 1) {
      const crystal: number = Math.sin(Math.floor(x / 3) * 91.7 + Math.floor(y / 3) * 73.1);
      const facet: number = ((x % 3) - (y % 3)) * 6;
      const tone: number = crystal * 29 + facet + (Math.random() - 0.5) * 12;
      const pixel: number = (y * size + x) * 4;
      for (let channel: number = 0; channel < 3; channel += 1) {
        img.data[pixel + channel] = (col[channel] ?? 0) + tone;
      }
      img.data[pixel + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(cvs);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createGlassGeom(hgt: number, isRound: boolean): BufferGeometry {
  if (isRound) {
    return new LatheGeometry(
      [
        new Vector2(0, 0),
        new Vector2(0.3, 0),
        new Vector2(0.325, 0.02),
        new Vector2(0.405, hgt - 0.018),
        new Vector2(0.403, hgt),
        new Vector2(0.386, hgt),
        new Vector2(0.388, hgt - 0.018),
        new Vector2(0.308, 0.07),
        new Vector2(0, 0.055),
      ],
      64,
    );
  }
  const wall: Shape = squarePath(new Shape(), 0.405, 0.035);
  wall.holes.push(squarePath(new Path(), 0.385, 0.025));
  const walls = new ExtrudeGeometry(wall, {
    depth: hgt - 0.055,
    bevelEnabled: false,
    curveSegments: 8,
  });
  walls.rotateX(-Math.PI / 2);
  walls.translate(0, 0.055, 0);
  const pos: BufferAttribute | InterleavedBufferAttribute = walls.getAttribute("position");
  for (let vtx: number = 0; vtx < pos.count; vtx += 1) {
    const scale: number = 0.81 + (pos.getY(vtx) / hgt) * 0.19;
    pos.setXYZ(vtx, pos.getX(vtx) * scale, pos.getY(vtx), pos.getZ(vtx) * scale);
  }
  walls.computeVertexNormals();
  const base: BufferGeometry = new BoxGeometry(0.665, 0.055, 0.665).toNonIndexed();
  base.translate(0, 0.0275, 0);
  const geom: BufferGeometry = mergeGeometries([base, walls], false);
  base.dispose();
  walls.dispose();
  if (!geom) throw new Error("Could not create square coffee glass");
  return geom;
}

export function createCoffeeDetails(traits: PieceTraits, mats: CoffeeMaterials): Group {
  const dtls = new Group();
  dtls.name = "coffee-glass";
  dtls.visible = false;
  const hgt: 0.9 | 1.45 = traits.isBig ? 1.45 : 0.9;
  const glass = new Mesh(createGlassGeom(hgt, traits.isRound), mats.glass);
  glass.name = "glass-shell";
  const rayCast: (raycaster: Raycaster, intersects: Intersection[]) => void =
    glass.raycast.bind(glass);
  glass.raycast = (ray: Raycaster, hits: Intersection<Object3D<Object3DEventMap>>[]): void => {
    if (dtls.visible) rayCast(ray, hits);
  };
  const shape: Shape = squarePath(new Shape(), 0.375, 0.03);
  if (!traits.isSolid) shape.holes.push(squarePath(new Path(), 0.205, 0.023));
  const surf = new Mesh(
    traits.isRound
      ? new RingGeometry(traits.isSolid ? 0 : 0.205, 0.375, 64)
      : new ShapeGeometry(shape, 8),
    mats.surface,
  );
  surf.name = "coffee-surface";
  surf.rotation.x = -Math.PI / 2;
  surf.position.y = hgt - 0.12;
  surf.receiveShadow = true;
  surf.raycast = (): void => {};
  if (!traits.isSolid) {
    const sugar = new Mesh(new RoundedBoxGeometry(0.24, 0.24, 0.24, 2, 0.012), mats.sugar);
    sugar.name = "brown-sugar-cube";
    sugar.position.y = hgt - 0.126;
    sugar.rotation.y = traits.isRound ? 0.3 : -0.18;
    sugar.castShadow = true;
    sugar.receiveShadow = true;
    sugar.raycast = (): void => {};
    dtls.add(sugar);
  }
  const bubbleGeometry = new SphereGeometry(0.012, 8, 6);
  for (let idx: number = 0; idx < 5; idx += 1) {
    const ang: number = idx * 0.19 + (traits.isBig ? 0.7 : 2.1);
    const bubble = new Mesh(bubbleGeometry, mats.bubble);
    bubble.position.set(Math.cos(ang) * 0.32, hgt - 0.118, Math.sin(ang) * 0.32);
    bubble.scale.set(1, 0.22, 1);
    bubble.raycast = (): void => {};
    dtls.add(bubble);
  }
  dtls.add(glass, surf);
  return dtls;
}
