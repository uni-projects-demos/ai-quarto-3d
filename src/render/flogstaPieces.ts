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
  const cvs: HTMLCanvasElement = document.createElement("canvas");
  cvs.width = size;
  cvs.height = size;
  const ctx: CanvasRenderingContext2D | null = cvs.getContext("2d");
  if (!ctx) throw new Error("Could not create weathered timber texture");
  const img: ImageData = ctx.createImageData(size, size);
  const timberCol = [153, 147, 127] as const;
  const paintCol: number[] | null =
    paint === undefined ? null : [paint >> 16, (paint >> 8) & 255, paint & 255];
  const ofsX: number = Math.random() * 1000;
  const ofsY: number = Math.random() * 1000;
  const planks: number[] = Array.from({ length: 7 }, (): number => Math.random() * 32 - 16);
  const chipboard = substrate === "chipboard";
  for (let y: number = 0; y < size; y += 1) {
    for (let x: number = 0; x < size; x += 1) {
      const grain: number = chipboard
        ? 0
        : x + 7 * Math.sin((y + ofsY) / 93) + 3 * Math.sin(y / 31);
      const noise: number = Math.sin(x * 91.7 + y * 73.1 + ofsX);
      const patch: number =
        Math.sin((x + ofsX) / 79 + Math.sin(y / 117)) *
        Math.cos((y + ofsY) / 103 + Math.sin(x / 83));
      const split: number = Math.max(0, Math.sin(grain * 0.17) - 0.976) * 1300;
      const water: number = Math.max(0, patch + 0.1) ** 2 * 73;
      const plank: number = planks[Math.floor((x * planks.length) / size)] ?? 0;
      const tone: number = chipboard
        ? noise * 19 - water
        : 7 * Math.sin(grain * 1.3) +
          10 * Math.sin(grain * 0.23) +
          noise * 8 +
          plank -
          split -
          water;
      const paintMask: number = patch + noise * 0.27;
      const pixel: number = (y * size + x) * 4;
      for (let channel: number = 0; channel < 3; channel += 1) {
        const col: number | undefined = paintCol?.[channel];
        img.data[pixel + channel] =
          col !== undefined && paintMask > -0.23
            ? col + noise * 10 - water * 0.45 + (paintMask < -0.1 ? 27 : 0)
            : (timberCol[channel] ?? 129) + tone;
      }
      img.data[pixel + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (chipboard) {
    const chips = ["#b9a57e", "#ceb991", "#8c7a58", "#ddd0ad", "#a08c66"] as const;
    ctx.save();
    ctx.globalAlpha = paint === undefined ? 0.7 : 0.15;
    for (let idx: number = 0; idx < 14000; idx += 1) {
      const wdt: number = 2 + Math.random() * 5;
      const len: number = 4 + Math.random() * 14;
      ctx.save();
      ctx.translate(Math.random() * size, Math.random() * size);
      ctx.rotate(Math.random() * Math.PI);
      ctx.fillStyle = chips[idx % chips.length] ?? chips[0];
      ctx.beginPath();
      ctx.moveTo(-wdt / 2, -len / 2);
      ctx.lineTo(wdt / 2, -len / 3);
      ctx.lineTo(wdt / 3, len / 2);
      ctx.lineTo(-wdt / 2, len / 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }
  const blotch: (x: number, y: number, rad: number, col: string) => void = (
    x: number,
    y: number,
    rad: number,
    col: string,
  ): void => {
    const grad: CanvasGradient = ctx.createRadialGradient(x, y, 0, x, y, rad);
    grad.addColorStop(0, col);
    grad.addColorStop(1, "transparent");
    ctx.fillStyle = grad;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  };
  for (let idx: number = 0; idx < 26; idx += 1) {
    blotch(
      Math.random() * size,
      Math.random() * size,
      45 + Math.random() * 230,
      idx % 3 === 0 ? "rgba(233, 227, 204, 0.48)" : "rgba(44, 44, 29, 0.32)",
    );
  }
  for (let idx: number = 0; idx < 120; idx += 1) {
    const x: number = Math.random() * size;
    const y: number = Math.random() * size;
    const len: number = 12 + Math.random() * 180;
    const drift: number = Math.random() * 18 - 9;
    ctx.strokeStyle = Math.random() < 0.3 ? "rgba(228, 215, 176, 0.72)" : "rgba(40, 34, 22, 0.6)";
    ctx.lineWidth = 0.5 + Math.random() * 2.8;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x + drift, y + len / 3, x - drift, y + len * 0.7, x + drift, y + len);
    ctx.stroke();
  }
  for (let idx: number = 0; idx < (chipboard ? 0 : 7); idx += 1) {
    const x: number = Math.random() * size;
    const y: number = Math.random() * size;
    const rad: number = 9 + Math.random() * 12;
    for (let ring: number = 0; ring < 4; ring += 1) {
      ctx.strokeStyle = `rgba(64, 46, 26, ${0.28 - ring * 0.045})`;
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.ellipse(x, y, rad + ring * 4, rad * 2.4 + ring * 7, 0.03, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (paint === undefined) {
    for (let idx: number = 0; idx < 13; idx += 1) {
      const x: number = Math.random() * size;
      const y: number = Math.random() * size;
      const rad: number = 25 + Math.random() * 53;
      const ang: number = Math.random() * Math.PI;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(ang);
      ctx.scale(0.65 + Math.random() * 0.55, 0.6 + Math.random() * 0.5);
      const start: number = Math.random() * Math.PI;
      ctx.strokeStyle = idx % 3 === 0 ? "rgba(108, 56, 25, 0.35)" : "rgba(59, 32, 15, 0.4)";
      ctx.lineWidth = 2 + Math.random() * 5;
      ctx.beginPath();
      ctx.arc(0, 0, rad, start, start + Math.PI * (1.05 + Math.random() * 0.8));
      ctx.stroke();
      blotch(0, 0, rad * 1.2, "rgba(86, 49, 22, 0.22)");
      ctx.restore();
    }
    for (let idx: number = 0; idx < 20; idx += 1) {
      const x: number = Math.random() * size;
      const y: number = Math.random() * size;
      const rad: number = 10 + Math.random() * 44;
      blotch(x, y, rad, idx % 2 === 0 ? "rgba(71, 34, 16, 0.4)" : "rgba(121, 67, 24, 0.32)");
      ctx.strokeStyle = "rgba(82, 44, 19, 0.3)";
      ctx.lineWidth = 1 + Math.random() * 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + rad, y + rad, x + rad * 0.4, y + rad * 2.6);
      ctx.stroke();
    }
    for (let idx: number = 0; idx < 11; idx += 1) {
      const x: number = Math.random() * size;
      const y: number = Math.random() * size;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.random() * Math.PI);
      ctx.scale(0.38, 1);
      blotch(0, 0, 25 + Math.random() * 42, "rgba(42, 33, 24, 0.52)");
      ctx.fillStyle = "rgba(38, 28, 18, 0.72)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 3, 9 + Math.random() * 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  const tex = new CanvasTexture(cvs);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

export function createSalmonTexture(): CanvasTexture {
  const cvs: HTMLCanvasElement = document.createElement("canvas");
  cvs.width = 256;
  cvs.height = 256;
  const ctx: CanvasRenderingContext2D | null = cvs.getContext("2d");
  if (!ctx) throw new Error("Could not create salmon texture");
  const flesh: CanvasGradient = ctx.createLinearGradient(0, 0, 256, 256);
  flesh.addColorStop(0, "#d87055");
  flesh.addColorStop(0.5, "#c95e47");
  flesh.addColorStop(1, "#de7e62");
  ctx.fillStyle = flesh;
  ctx.fillRect(0, 0, 256, 256);
  for (let band: number = -100; band < 360; band += 32) {
    ctx.beginPath();
    ctx.moveTo(-20, band + 58);
    ctx.bezierCurveTo(52, band + 18, 163, band + 20, 276, band - 35);
    ctx.strokeStyle = "#ffd6bb";
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 235, 216, 0.8)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  const tex = new CanvasTexture(cvs);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createRiceGrains(
  body: BufferGeometry,
  traits: PieceTraits,
  mat: MeshPhysicalMaterial,
  geom: SphereGeometry,
): InstancedMesh<SphereGeometry, MeshPhysicalMaterial> {
  const grains = new InstancedMesh(geom, mat, 1100);
  grains.name = "rice-grains";
  grains.visible = false;
  const sampler: MeshSurfaceSampler = new MeshSurfaceSampler(new Mesh(body, mat)).build();
  const pos = new Vector3();
  const norm = new Vector3();
  const grain = new Object3D();
  const hgt: 0.9 | 1.45 = traits.isBig ? 1.45 : 0.9;
  let cnt: number = 0;
  for (let attempt: number = 0; attempt < 2200 && cnt < 1100; attempt += 1) {
    sampler.sample(pos, norm);
    if (norm.y < -0.5) continue;
    if (
      !traits.isSolid &&
      pos.y > hgt / 2 - 0.14 &&
      Math.max(Math.abs(pos.x), Math.abs(pos.z)) < 0.24
    )
      continue;
    grain.position.copy(pos).addScaledVector(norm, 0.008);
    grain.quaternion.setFromUnitVectors(Object3D.DEFAULT_UP, norm);
    grain.rotateY(Math.random() * Math.PI * 2);
    grain.scale.set(0.021 + Math.random() * 0.008, 0.012, 0.047 + Math.random() * 0.017);
    grain.updateMatrix();
    grains.setMatrixAt(cnt, grain.matrix);
    cnt += 1;
  }
  grains.count = cnt;
  grains.position.y = hgt / 2;
  grains.receiveShadow = true;
  grains.raycast = (): void => {};
  grains.computeBoundingSphere();
  return grains;
}
