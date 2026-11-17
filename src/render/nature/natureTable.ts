import {
  type BufferAttribute,
  CanvasTexture,
  CircleGeometry,
  ClampToEdgeWrapping,
  type InterleavedBufferAttribute,
  LatheGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
} from "three";

const SEGMENTS: number = 384;
const FULL_TURN: number = Math.PI * 2;

function edgeNoise(ang: number, smps: number, seed: number): number {
  const pos: number = ((((ang % FULL_TURN) + FULL_TURN) % FULL_TURN) / FULL_TURN) * smps;
  const idx: number = Math.floor(pos);
  const frac: number = pos - idx;
  const blend: number = frac * frac * (3 - 2 * frac);
  const val: (smp: number) => number = (smp: number): number => {
    const hash: number = Math.sin((smp + seed) * 127.1) * 43758.5453;
    return (hash - Math.floor(hash)) * 2 - 1;
  };
  return val(idx) * (1 - blend) + val((idx + 1) % smps) * blend;
}

function groove(ang: number, centre: number, wdt: number): number {
  const dist: number = Math.atan2(Math.sin(ang - centre), Math.cos(ang - centre));
  return Math.exp(-(dist * dist) / (2 * wdt * wdt));
}

function barkRelief(ang: number, depth: number): number {
  const warped: number =
    ang + edgeNoise(ang, 13, 31) * 0.035 + Math.sin(depth * 7 + ang * 5) * 0.012;
  const furrows: number = Math.max(0, Math.cos(warped * 53 + edgeNoise(ang, 17, 67) * 3)) ** 12;
  const plates: number = edgeNoise(warped + depth * 0.025, 27, 101) * 0.045;
  const fibres: number = edgeNoise(warped + depth * 0.012, 157, 47) * 0.03;
  const layers: number = Math.sin(depth * 37 + edgeNoise(ang, 31, 17) * 13) * 0.009;
  const knots: number =
    groove(ang, -1.1, 0.065) * Math.exp(-((depth - 0.54) ** 2) / 0.025) +
    groove(ang, 0.53, 0.07) * Math.exp(-((depth - 0.7) ** 2) / 0.018);
  return (plates + fibres + layers - furrows * 0.16 + knots * 0.04) * Math.min(1, depth / 0.1);
}

export function trunkRadius(ang: number, rad: number): number {
  return (
    rad +
    edgeNoise(ang, 7, 11) * 0.58 +
    edgeNoise(ang, 19, 23) * 0.2 +
    edgeNoise(ang, 61, 37) * 0.065 +
    edgeNoise(ang, 127, 53) * 0.025 -
    groove(ang, -2.75, 0.052) * 0.2 -
    groove(ang, -2.32, 0.073) * 0.28 -
    groove(ang, -1.61, 0.18) * 0.47 -
    groove(ang, -0.96, 0.054) * 0.2 -
    groove(ang, -0.35, 0.09) * 0.28 -
    groove(ang, 0.53, 0.13) * 0.45 -
    groove(ang, 1.39, 0.052) * 0.26 -
    groove(ang, 2.55, 0.18) * 0.52 -
    groove(ang, 3.06, 0.062) * 0.18
  );
}

export function createTrunkTable(
  rad: number,
  bevel: number,
): {
  top: CircleGeometry;
  edge: LatheGeometry;
} {
  const thick: number = 0.64;
  const top: CircleGeometry = new CircleGeometry(rad - bevel, SEGMENTS);
  const edge: LatheGeometry = new LatheGeometry(
    [
      new Vector2(rad - 0.1, -thick),
      new Vector2(rad - 0.03, -thick + 0.025),
      new Vector2(rad, -thick + 0.09),
      ...Array.from(
        { length: 11 },
        (_: unknown, idx: number): Vector2 =>
          new Vector2(rad, -thick + 0.09 + ((thick - 0.18) * (idx + 1)) / 12),
      ),
      new Vector2(rad, -0.09),
      new Vector2(rad - 0.02, -0.025),
      new Vector2(rad - bevel, 0),
    ],
    SEGMENTS,
  );

  for (const [geom, flat] of [
    [top, true],
    [edge, false],
  ] as const) {
    const posArr: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("position");
    const uv: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("uv");
    for (let vtx: number = 0; vtx < posArr.count; vtx += 1) {
      const x: number = posArr.getX(vtx);
      const z: number = flat ? -posArr.getY(vtx) : posArr.getZ(vtx);
      const origRad: number = Math.hypot(x, z);
      if (origRad < 0.1) continue;
      const ang: number = Math.atan2(-z, x);
      const y: number = posArr.getY(vtx);
      const bark: number = flat ? 0 : barkRelief(ang, -y / thick);
      const natRad: number = origRad + trunkRadius(ang, rad) - rad + bark;
      const scale: number = natRad / origRad;
      if (flat) {
        posArr.setXY(vtx, x * scale, -z * scale);
        uv.setXY(vtx, 0.5 + (x * scale) / (2 * rad), 0.5 - (z * scale) / (2 * rad));
      } else {
        posArr.setXYZ(vtx, x * scale, y, z * scale);
        uv.setXY(vtx, uv.getX(vtx), (y + thick) / thick);
      }
    }
    geom.computeVertexNormals();
    geom.computeBoundingSphere();
  }
  weldTrunkEdge(edge);
  return { top, edge };
}

export function weldTrunkEdge(edge: LatheGeometry): void {
  const normals: BufferAttribute | InterleavedBufferAttribute = edge.getAttribute("normal");
  const rows: number = edge.parameters.points.length;
  for (let row: number = 0; row < rows; row += 1) {
    const last: number = edge.parameters.segments * rows + row;
    const x: number = normals.getX(row) + normals.getX(last);
    const y: number = normals.getY(row) + normals.getY(last);
    const z: number = normals.getZ(row) + normals.getZ(last);
    const len: number = Math.hypot(x, y, z) || 1;
    normals.setXYZ(row, x / len, y / len, z / len);
    normals.setXYZ(last, x / len, y / len, z / len);
  }
  normals.needsUpdate = true;
}

export function createTrunkBarkTexture(): CanvasTexture {
  const cvs: HTMLCanvasElement = document.createElement("canvas");
  cvs.width = 2048;
  cvs.height = 256;
  const ctx: CanvasRenderingContext2D | null = cvs.getContext("2d");
  if (!ctx) throw new Error("Could not create trunk bark texture");
  const img: ImageData = ctx.createImageData(cvs.width, cvs.height);
  for (let y: number = 0; y < cvs.height; y += 1) {
    for (let x: number = 0; x < cvs.width; x += 1) {
      const u: number = (x / (cvs.width - 1)) * FULL_TURN - Math.PI / 2;
      const v: number = y / (cvs.height - 1);
      const relief: number = barkRelief(u, v);
      const flecks: number = Math.sin(Math.sin(u * 977 + v * 127.1) * 43758.5453) * 0.035;
      const knotX: number = Math.atan2(Math.sin(u + 1.1), Math.cos(u + 1.1)) / 0.025;
      const knotY: number = (v - 0.54) / 0.22;
      const knotRadius: number = Math.hypot(knotX, knotY);
      const knot: number = Math.exp(-knotRadius * knotRadius * 1.3);
      const tone: number =
        0.56 +
        edgeNoise(u + v * 0.03, 21, 23) * 0.16 +
        relief * 3.5 +
        edgeNoise(u + v * 0.021, 317, 79) * 0.065 +
        (Math.cos(knotRadius * 20) * 0.08 - 0.075) * knot +
        flecks;
      const band: number = Math.max(0, 1 - v / 0.055);
      const lichen: number =
        Math.min(
          0.24,
          Math.max(0, edgeNoise(u + v * 0.13, 37, 83) - 0.56) *
            Math.max(0, edgeNoise(u - v * 0.07, 11, 41) - 0.3) *
            15,
        ) *
        (1 - band);
      const red: number = (65 + tone * 110) * (1 - band) + 178 * band;
      const green: number = (47 + tone * 82) * (1 - band) + 139 * band;
      const blue: number = (29 + tone * 54) * (1 - band) + 91 * band;
      const pixel: number = (y * cvs.width + x) * 4;
      img.data[pixel] = red * (1 - lichen) + 149 * lichen;
      img.data[pixel + 1] = green * (1 - lichen) + 150 * lichen;
      img.data[pixel + 2] = blue * (1 - lichen) + 113 * lichen;
      img.data[pixel + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new CanvasTexture(cvs);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = ClampToEdgeWrapping;
  tex.anisotropy = 8;
  return tex;
}
