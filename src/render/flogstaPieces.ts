import {
  type BufferGeometry,
  CanvasTexture,
  InstancedMesh,
  Mesh,
  type MeshPhysicalMaterial,
  Object3D,
  RepeatWrapping,
  type SphereGeometry,
  SRGBColorSpace,
  Vector3,
} from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";
import type { PieceTraits } from "../game/pieces";

export function createWeatheredTexture(
  paint?: number,
  substrate: "pine" | "chipboard" = "pine",
): CanvasTexture {
  const size = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create weathered timber texture");
  const img = context.createImageData(size, size);
  const timberCol = [153, 147, 127] as const;
  const paintCol = paint === undefined ? null : [paint >> 16, (paint >> 8) & 255, paint & 255];
  const offsetX = Math.random() * 1000;
  const offsetY = Math.random() * 1000;
  const planks = Array.from({ length: 7 }, (): number => Math.random() * 32 - 16);
  const chipboard = substrate === "chipboard";
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const grain = chipboard ? 0 : x + 7 * Math.sin((y + offsetY) / 93) + 3 * Math.sin(y / 31);
      const noise = Math.sin(x * 91.7 + y * 73.1 + offsetX);
      const patch =
        Math.sin((x + offsetX) / 79 + Math.sin(y / 117)) *
        Math.cos((y + offsetY) / 103 + Math.sin(x / 83));
      const split = Math.max(0, Math.sin(grain * 0.17) - 0.976) * 1300;
      const water = Math.max(0, patch + 0.1) ** 2 * 73;
      const plank = planks[Math.floor((x * planks.length) / size)] ?? 0;
      const tone = chipboard
        ? noise * 19 - water
        : 7 * Math.sin(grain * 1.3) +
          10 * Math.sin(grain * 0.23) +
          noise * 8 +
          plank -
          split -
          water;
      const paintMask = patch + noise * 0.27;
      const pixel = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        const col = paintCol?.[channel];
        img.data[pixel + channel] =
          col !== undefined && paintMask > -0.23
            ? col + noise * 10 - water * 0.45 + (paintMask < -0.1 ? 27 : 0)
            : (timberCol[channel] ?? 129) + tone;
      }
      img.data[pixel + 3] = 255;
    }
  }
  context.putImageData(img, 0, 0);
  if (chipboard) {
    const chips = ["#b9a57e", "#ceb991", "#8c7a58", "#ddd0ad", "#a08c66"] as const;
    context.save();
    context.globalAlpha = paint === undefined ? 0.7 : 0.15;
    for (let idx = 0; idx < 14000; idx += 1) {
      const width = 2 + Math.random() * 5;
      const length = 4 + Math.random() * 14;
      context.save();
      context.translate(Math.random() * size, Math.random() * size);
      context.rotate(Math.random() * Math.PI);
      context.fillStyle = chips[idx % chips.length] ?? chips[0];
      context.beginPath();
      context.moveTo(-width / 2, -length / 2);
      context.lineTo(width / 2, -length / 3);
      context.lineTo(width / 3, length / 2);
      context.lineTo(-width / 2, length / 3);
      context.closePath();
      context.fill();
      context.restore();
    }
    context.restore();
  }
  const blotch = (x: number, y: number, radius: number, col: string): void => {
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, col);
    gradient.addColorStop(1, "transparent");
    context.fillStyle = gradient;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  for (let idx = 0; idx < 26; idx += 1) {
    blotch(
      Math.random() * size,
      Math.random() * size,
      45 + Math.random() * 230,
      idx % 3 === 0 ? "rgba(233, 227, 204, 0.48)" : "rgba(44, 44, 29, 0.32)",
    );
  }
  for (let idx = 0; idx < 120; idx += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 12 + Math.random() * 180;
    const drift = Math.random() * 18 - 9;
    context.strokeStyle =
      Math.random() < 0.3 ? "rgba(228, 215, 176, 0.72)" : "rgba(40, 34, 22, 0.6)";
    context.lineWidth = 0.5 + Math.random() * 2.8;
    context.beginPath();
    context.moveTo(x, y);
    context.bezierCurveTo(x + drift, y + len / 3, x - drift, y + len * 0.7, x + drift, y + len);
    context.stroke();
  }
  for (let idx = 0; idx < (chipboard ? 0 : 7); idx += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 9 + Math.random() * 12;
    for (let ring = 0; ring < 4; ring += 1) {
      context.strokeStyle = `rgba(64, 46, 26, ${0.28 - ring * 0.045})`;
      context.lineWidth = 1.3;
      context.beginPath();
      context.ellipse(x, y, radius + ring * 4, radius * 2.4 + ring * 7, 0.03, 0, Math.PI * 2);
      context.stroke();
    }
  }
  if (paint === undefined) {
    for (let idx = 0; idx < 13; idx += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 25 + Math.random() * 53;
      const angle = Math.random() * Math.PI;
      context.save();
      context.translate(x, y);
      context.rotate(angle);
      context.scale(0.65 + Math.random() * 0.55, 0.6 + Math.random() * 0.5);
      const start = Math.random() * Math.PI;
      context.strokeStyle = idx % 3 === 0 ? "rgba(108, 56, 25, 0.35)" : "rgba(59, 32, 15, 0.4)";
      context.lineWidth = 2 + Math.random() * 5;
      context.beginPath();
      context.arc(0, 0, radius, start, start + Math.PI * (1.05 + Math.random() * 0.8));
      context.stroke();
      blotch(0, 0, radius * 1.2, "rgba(86, 49, 22, 0.22)");
      context.restore();
    }
    for (let idx = 0; idx < 20; idx += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const radius = 10 + Math.random() * 44;
      blotch(x, y, radius, idx % 2 === 0 ? "rgba(71, 34, 16, 0.4)" : "rgba(121, 67, 24, 0.32)");
      context.strokeStyle = "rgba(82, 44, 19, 0.3)";
      context.lineWidth = 1 + Math.random() * 3;
      context.beginPath();
      context.moveTo(x, y);
      context.quadraticCurveTo(x + radius, y + radius, x + radius * 0.4, y + radius * 2.6);
      context.stroke();
    }
    for (let idx = 0; idx < 11; idx += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      context.save();
      context.translate(x, y);
      context.rotate(Math.random() * Math.PI);
      context.scale(0.38, 1);
      blotch(0, 0, 25 + Math.random() * 42, "rgba(42, 33, 24, 0.52)");
      context.fillStyle = "rgba(38, 28, 18, 0.72)";
      context.beginPath();
      context.ellipse(0, 0, 3, 9 + Math.random() * 6, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export function createSalmonTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create salmon texture");
  const flesh = context.createLinearGradient(0, 0, 256, 256);
  flesh.addColorStop(0, "#d87055");
  flesh.addColorStop(0.5, "#c95e47");
  flesh.addColorStop(1, "#de7e62");
  context.fillStyle = flesh;
  context.fillRect(0, 0, 256, 256);
  for (let band = -100; band < 360; band += 32) {
    context.beginPath();
    context.moveTo(-20, band + 58);
    context.bezierCurveTo(52, band + 18, 163, band + 20, 276, band - 35);
    context.strokeStyle = "#ffd6bb";
    context.lineWidth = 7;
    context.stroke();
    context.strokeStyle = "rgba(255, 235, 216, 0.8)";
    context.lineWidth = 2;
    context.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

export function createRiceGrains(
  body: BufferGeometry,
  traits: PieceTraits,
  material: MeshPhysicalMaterial,
  geometry: SphereGeometry,
): InstancedMesh<SphereGeometry, MeshPhysicalMaterial> {
  const grains = new InstancedMesh(geometry, material, 1100);
  grains.name = "rice-grains";
  grains.visible = false;
  const sampler = new MeshSurfaceSampler(new Mesh(body, material)).build();
  const pos = new Vector3();
  const norm = new Vector3();
  const grain = new Object3D();
  const height = traits.isBig ? 1.45 : 0.9;
  let count = 0;
  for (let attempt = 0; attempt < 2200 && count < 1100; attempt += 1) {
    sampler.sample(pos, norm);
    if (norm.y < -0.5) continue;
    if (
      !traits.isSolid &&
      pos.y > height / 2 - 0.14 &&
      Math.max(Math.abs(pos.x), Math.abs(pos.z)) < 0.24
    )
      continue;
    grain.position.copy(pos).addScaledVector(norm, 0.008);
    grain.quaternion.setFromUnitVectors(Object3D.DEFAULT_UP, norm);
    grain.rotateY(Math.random() * Math.PI * 2);
    grain.scale.set(0.021 + Math.random() * 0.008, 0.012, 0.047 + Math.random() * 0.017);
    grain.updateMatrix();
    grains.setMatrixAt(count, grain.matrix);
    count += 1;
  }
  grains.count = count;
  grains.position.y = height / 2;
  grains.receiveShadow = true;
  grains.raycast = (): void => {};
  grains.computeBoundingSphere();
  return grains;
}
