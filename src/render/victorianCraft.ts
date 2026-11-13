import {
  type BufferAttribute,
  type BufferGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Group,
  type InterleavedBufferAttribute,
  LatheGeometry,
  Mesh,
  type MeshPhysicalMaterial,
  Shape,
  SRGBColorSpace,
  TorusGeometry,
  Vector2,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { PieceTraits } from "../game/pieces";
import { createHollowSquare } from "./geometry";
import { createWoodCanvas } from "./textures";

export interface VictorianCraftMaterials {
  satinwood: MeshPhysicalMaterial;
  darkString: MeshPhysicalMaterial;
  darkBody: MeshPhysicalMaterial;
  redBody: MeshPhysicalMaterial;
  brass: MeshPhysicalMaterial;
}

export function createSatinwoodTexture(): CanvasTexture {
  const cvs: HTMLCanvasElement = createWoodCanvas();
  const tex: CanvasTexture = new CanvasTexture(cvs);
  tex.colorSpace = SRGBColorSpace;
  const ctx: CanvasRenderingContext2D | null = cvs.getContext("2d");
  if (!ctx) return tex;

  ctx.fillStyle = "#f8eed7";
  ctx.fillRect(0, 0, 512, 512);
  for (let strand: number = 0; strand < 250; strand += 1) {
    const x: number = strand * 2.1;
    ctx.strokeStyle = `rgba(133, 101, 55, ${0.025 + (strand % 7) * 0.008})`;
    ctx.lineWidth = strand % 5 === 0 ? 1.2 : 0.5;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + Math.sin(strand) * 9, 170, x - Math.cos(strand * 0.6) * 8, 340, x, 512);
    ctx.stroke();
  }
  tex.needsUpdate = true;
  return tex;
}

export function createVictorianRoundGeometry(hgt: number, isHollow: boolean): LatheGeometry {
  const geom = new LatheGeometry(
    [
      new Vector2(0, 0),
      new Vector2(0.415, 0),
      new Vector2(0.432, 0.014),
      new Vector2(0.442, 0.034),
      new Vector2(0.442, 0.049),
      new Vector2(0.43, 0.068),
      new Vector2(0.41, 0.082),
      new Vector2(0.392, 0.1),
      new Vector2(0.383, 0.13),
      new Vector2(0.368, 0.145),
      new Vector2(0.361, 0.175),
      new Vector2(0.344, 0.205),
      new Vector2(0.337, hgt * 0.42),
      new Vector2(0.341, hgt - 0.22),
      new Vector2(0.353, hgt - 0.185),
      new Vector2(0.367, hgt - 0.164),
      new Vector2(0.388, hgt - 0.145),
      new Vector2(0.393, hgt - 0.13),
      new Vector2(0.391, hgt - 0.111),
      new Vector2(0.384, hgt - 0.092),
      new Vector2(0.38, hgt - 0.045),
      new Vector2(0.377, hgt - 0.018),
      new Vector2(0.369, hgt),
      ...(isHollow
        ? [
            new Vector2(0.22, hgt),
            new Vector2(0.205, hgt - 0.012),
            new Vector2(0.205, hgt - 0.12),
            new Vector2(0, hgt - 0.12),
          ]
        : [new Vector2(0, hgt)]),
    ],
    64,
    Math.PI,
  );
  const posArr: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("position");
  for (let vtx: number = 0; vtx < posArr.count; vtx += 1) {
    const y: number = posArr.getY(vtx);
    if (y < 0.204 || y > hgt - 0.219) continue;
    const x: number = posArr.getX(vtx);
    const z: number = posArr.getZ(vtx);
    const rad: number = Math.hypot(x, z);
    const ang: number = Math.atan2(x, z);
    const cut: number = 0.004 * (1 + Math.cos(ang * 12));
    const scale: number = (rad - cut) / rad;
    posArr.setXYZ(vtx, x * scale, y, z * scale);
  }
  geom.computeVertexNormals();
  geom.translate(0, -hgt / 2, 0);
  return geom;
}

export function createVictorianSquareGeometry(hgt: number, isHollow: boolean): BufferGeometry {
  if (!isHollow) return new RoundedBoxGeometry(0.74, hgt, 0.74, 3, 0.018);
  return createHollowSquare(hgt, true, "victorian");
}

export function createVictorianPieceDetails(
  traits: PieceTraits,
  hgt: number,
  mats: VictorianCraftMaterials,
): Group {
  const dtls = new Group();
  dtls.name = "victorian-details";
  dtls.visible = false;
  const batches = new Map<MeshPhysicalMaterial, BufferGeometry[]>();
  const add: (geom: BufferGeometry, mat: MeshPhysicalMaterial) => void = (
    geom: BufferGeometry,
    mat: MeshPhysicalMaterial,
  ): void => {
    const parts: BufferGeometry[] = batches.get(mat) ?? [];
    parts.push(geom.index ? geom.toNonIndexed() : geom);
    batches.set(mat, parts);
  };
  if (traits.isRound) {
    for (const [y, rad, thick, mat] of [
      [0.047, 0.444, 0.007, mats.satinwood],
      [0.087, 0.407, 0.004, mats.brass],
      [hgt - 0.143, 0.392, 0.008, mats.satinwood],
      [hgt - 0.114, 0.394, 0.0035, mats.brass],
    ] as const) {
      const band = new TorusGeometry(rad, thick, 8, 64);
      band.rotateX(Math.PI / 2);
      band.translate(0, y, 0);
      add(band, mat);
    }
  } else {
    for (const [y, wdt, strip, mat] of [
      [0.052, 0.784, 0.03, mats.satinwood],
      [0.114, 0.755, 0.007, mats.brass],
      [hgt - 0.14, 0.768, 0.02, mats.satinwood],
      [hgt - 0.112, 0.755, 0.006, mats.brass],
    ] as const) {
      for (const part of miteredFrame(wdt, wdt, strip)) {
        part.rotateX(-Math.PI / 2);
        part.translate(0, y, 0);
        add(part, mat);
      }
    }
    const panelHeight: number = hgt - 0.46;
    const wood: MeshPhysicalMaterial = traits.isDark ? mats.darkBody : mats.redBody;
    for (let face: number = 0; face < 4; face += 1) {
      const ang: number = (face * Math.PI) / 2;
      for (const [wdt, h, strip, mat] of [
        [0.59, panelHeight + 0.034, 0.006, mats.darkString],
        [0.555, panelHeight, 0.013, wood],
        [0.52, panelHeight - 0.032, 0.008, mats.satinwood],
      ] as const) {
        for (const part of miteredFrame(wdt, h, strip)) {
          part.translate(0, hgt / 2, 0.374);
          part.rotateY(ang);
          add(part, mat);
        }
      }
      const flower = new Shape();
      flower.moveTo(0, 0.076);
      flower.bezierCurveTo(0.016, 0.036, 0.05, 0.025, 0.033, 0);
      flower.bezierCurveTo(0.049, -0.025, 0.015, -0.04, 0, -0.076);
      flower.bezierCurveTo(-0.015, -0.04, -0.049, -0.025, -0.033, 0);
      flower.bezierCurveTo(-0.05, 0.025, -0.016, 0.036, 0, 0.076);
      const ornament = new ExtrudeGeometry(flower, {
        depth: 0.003,
        bevelEnabled: true,
        bevelSize: 0.001,
        bevelThickness: 0.001,
        bevelSegments: 1,
        curveSegments: 8,
      });
      ornament.translate(0, hgt / 2, 0.375);
      ornament.rotateY(ang);
      add(ornament, mats.satinwood);
    }
  }
  for (const [mat, parts] of batches) {
    const geom: BufferGeometry = mergeGeometries(parts, false);
    if (!geom) throw new Error("Could not batch Victorian craftsmanship");
    const mesh = new Mesh(geom, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.raycast = (): void => {};
    dtls.add(mesh);
    for (const part of parts) part.dispose();
  }
  return dtls;
}

function miteredFrame(wdt: number, hgt: number, strip: number): ExtrudeGeometry[] {
  const outer = [
    [-wdt / 2, -hgt / 2],
    [wdt / 2, -hgt / 2],
    [wdt / 2, hgt / 2],
    [-wdt / 2, hgt / 2],
  ] as const;
  const inner: number[][] = outer.map(([x, y]: readonly [number, number]): number[] => [
    x - Math.sign(x) * strip,
    y - Math.sign(y) * strip,
  ]);
  return outer.map((point: readonly [number, number], idx: number): ExtrudeGeometry => {
    const nxt: number = (idx + 1) % 4;
    const shape = new Shape();
    shape.moveTo(point[0], point[1]);
    for (const vtx of [outer[nxt], inner[nxt], inner[idx]]) {
      if (vtx) shape.lineTo(vtx[0] ?? 0, vtx[1] ?? 0);
    }
    shape.closePath();
    const geom = new ExtrudeGeometry(shape, {
      depth: 0.004,
      bevelEnabled: true,
      bevelSize: 0.001,
      bevelThickness: 0.001,
      bevelSegments: 1,
      curveSegments: 1,
    });
    const posArr: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("position");
    const uvs: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("uv");
    for (let vtx: number = 0; vtx < posArr.count; vtx += 1) {
      const across: number = posArr.getX(vtx) / wdt + 0.5;
      const along: number = posArr.getY(vtx) / hgt + 0.5;
      uvs.setXY(vtx, idx % 2 === 0 ? along : across, idx % 2 === 0 ? across : along);
    }
    return geom;
  });
}
