import {
  type BufferGeometry,
  CanvasTexture,
  ExtrudeGeometry,
  Group,
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

export interface VictorianCraftMaterials {
  satinwood: MeshPhysicalMaterial;
  darkString: MeshPhysicalMaterial;
  darkBody: MeshPhysicalMaterial;
  redBody: MeshPhysicalMaterial;
  brass: MeshPhysicalMaterial;
}

export function createSatinwoodTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  const context = canvas.getContext("2d");
  if (!context) return texture;
  context.fillStyle = "#f8eed7";
  context.fillRect(0, 0, 512, 512);
  for (let strand = 0; strand < 250; strand += 1) {
    const x = strand * 2.1;
    context.strokeStyle = `rgba(133, 101, 55, ${0.025 + (strand % 7) * 0.008})`;
    context.lineWidth = strand % 5 === 0 ? 1.2 : 0.5;
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(
      x + Math.sin(strand) * 9,
      170,
      x - Math.cos(strand * 0.6) * 8,
      340,
      x,
      512,
    );
    context.stroke();
  }
  texture.needsUpdate = true;
  return texture;
}

export function createVictorianRoundGeometry(height: number, hollow: boolean): LatheGeometry {
  const geometry = new LatheGeometry(
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
      new Vector2(0.337, height * 0.42),
      new Vector2(0.341, height - 0.22),
      new Vector2(0.353, height - 0.185),
      new Vector2(0.367, height - 0.164),
      new Vector2(0.388, height - 0.145),
      new Vector2(0.393, height - 0.13),
      new Vector2(0.391, height - 0.111),
      new Vector2(0.384, height - 0.092),
      new Vector2(0.38, height - 0.045),
      new Vector2(0.377, height - 0.018),
      new Vector2(0.369, height),
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
    Math.PI,
  );
  const positions = geometry.getAttribute("position");
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const y = positions.getY(vertex);
    if (y < 0.204 || y > height - 0.219) continue;
    const x = positions.getX(vertex);
    const z = positions.getZ(vertex);
    const radius = Math.hypot(x, z);
    const angle = Math.atan2(x, z);
    const cut = 0.004 * (1 + Math.cos(angle * 12));
    const scale = (radius - cut) / radius;
    positions.setXYZ(vertex, x * scale, y, z * scale);
  }
  geometry.computeVertexNormals();
  geometry.translate(0, -height / 2, 0);
  return geometry;
}

export function createVictorianSquareGeometry(height: number, hollow: boolean): BufferGeometry {
  if (!hollow) return new RoundedBoxGeometry(0.74, height, 0.74, 3, 0.018);
  return createHollowSquare(height, true, "victorian");
}

export function createVictorianPieceDetails(
  traits: PieceTraits,
  height: number,
  materials: VictorianCraftMaterials,
): Group {
  const details = new Group();
  details.name = "victorian-details";
  details.visible = false;
  const batches = new Map<MeshPhysicalMaterial, BufferGeometry[]>();
  const add = (geometry: BufferGeometry, material: MeshPhysicalMaterial): void => {
    const parts = batches.get(material) ?? [];
    parts.push(geometry.index ? geometry.toNonIndexed() : geometry);
    batches.set(material, parts);
  };
  if (traits.isRound) {
    for (const [y, radius, thickness, material] of [
      [0.047, 0.444, 0.007, materials.satinwood],
      [0.087, 0.407, 0.004, materials.brass],
      [height - 0.143, 0.392, 0.008, materials.satinwood],
      [height - 0.114, 0.394, 0.0035, materials.brass],
    ] as const) {
      const band = new TorusGeometry(radius, thickness, 8, 64);
      band.rotateX(Math.PI / 2);
      band.translate(0, y, 0);
      add(band, material);
    }
  } else {
    for (const [y, width, strip, material] of [
      [0.052, 0.784, 0.03, materials.satinwood],
      [0.114, 0.755, 0.007, materials.brass],
      [height - 0.14, 0.768, 0.02, materials.satinwood],
      [height - 0.112, 0.755, 0.006, materials.brass],
    ] as const) {
      for (const part of miteredFrame(width, width, strip)) {
        part.rotateX(-Math.PI / 2);
        part.translate(0, y, 0);
        add(part, material);
      }
    }
    const panelHeight = height - 0.46;
    const wood = traits.isDark ? materials.darkBody : materials.redBody;
    for (let face = 0; face < 4; face += 1) {
      const angle = (face * Math.PI) / 2;
      for (const [width, h, strip, material] of [
        [0.59, panelHeight + 0.034, 0.006, materials.darkString],
        [0.555, panelHeight, 0.013, wood],
        [0.52, panelHeight - 0.032, 0.008, materials.satinwood],
      ] as const) {
        for (const part of miteredFrame(width, h, strip)) {
          part.translate(0, height / 2, 0.374);
          part.rotateY(angle);
          add(part, material);
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
      ornament.translate(0, height / 2, 0.375);
      ornament.rotateY(angle);
      add(ornament, materials.satinwood);
    }
  }
  for (const [material, parts] of batches) {
    const geometry = mergeGeometries(parts, false);
    if (!geometry) throw new Error("Could not batch Victorian craftsmanship");
    const mesh = new Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.raycast = (): void => {};
    details.add(mesh);
    for (const part of parts) part.dispose();
  }
  return details;
}

function miteredFrame(width: number, height: number, strip: number): ExtrudeGeometry[] {
  const outer = [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2],
    [-width / 2, height / 2],
  ] as const;
  const inner = outer.map(([x, y]) => [x - Math.sign(x) * strip, y - Math.sign(y) * strip]);
  return outer.map((point, idx) => {
    const next = (idx + 1) % 4;
    const shape = new Shape();
    shape.moveTo(point[0], point[1]);
    for (const vertex of [outer[next], inner[next], inner[idx]]) {
      if (vertex) shape.lineTo(vertex[0] ?? 0, vertex[1] ?? 0);
    }
    shape.closePath();
    const geometry = new ExtrudeGeometry(shape, {
      depth: 0.004,
      bevelEnabled: true,
      bevelSize: 0.001,
      bevelThickness: 0.001,
      bevelSegments: 1,
      curveSegments: 1,
    });
    const positions = geometry.getAttribute("position");
    const uvs = geometry.getAttribute("uv");
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const across = positions.getX(vertex) / width + 0.5;
      const along = positions.getY(vertex) / height + 0.5;
      uvs.setXY(vertex, idx % 2 === 0 ? along : across, idx % 2 === 0 ? across : along);
    }
    return geometry;
  });
}
