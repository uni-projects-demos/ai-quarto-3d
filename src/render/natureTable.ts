import {
  CanvasTexture,
  CircleGeometry,
  ClampToEdgeWrapping,
  LatheGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  Vector2,
} from "three";

const SEGMENTS = 384;
const FULL_TURN = Math.PI * 2;

function edgeNoise(angle: number, samples: number, seed: number): number {
  const pos = ((((angle % FULL_TURN) + FULL_TURN) % FULL_TURN) / FULL_TURN) * samples;
  const idx = Math.floor(pos);
  const fraction = pos - idx;
  const blend = fraction * fraction * (3 - 2 * fraction);
  const val = (sample: number): number => {
    const hash = Math.sin((sample + seed) * 127.1) * 43758.5453;
    return (hash - Math.floor(hash)) * 2 - 1;
  };
  return val(idx) * (1 - blend) + val((idx + 1) % samples) * blend;
}

function groove(angle: number, centre: number, width: number): number {
  const distance = Math.atan2(Math.sin(angle - centre), Math.cos(angle - centre));
  return Math.exp(-(distance * distance) / (2 * width * width));
}

function barkRelief(angle: number, depth: number): number {
  const warped = angle + edgeNoise(angle, 13, 31) * 0.035 + Math.sin(depth * 7 + angle * 5) * 0.012;
  const furrows = Math.max(0, Math.cos(warped * 53 + edgeNoise(angle, 17, 67) * 3)) ** 12;
  const plates = edgeNoise(warped + depth * 0.025, 27, 101) * 0.045;
  const fibres = edgeNoise(warped + depth * 0.012, 157, 47) * 0.03;
  const layers = Math.sin(depth * 37 + edgeNoise(angle, 31, 17) * 13) * 0.009;
  const knots =
    groove(angle, -1.1, 0.065) * Math.exp(-((depth - 0.54) ** 2) / 0.025) +
    groove(angle, 0.53, 0.07) * Math.exp(-((depth - 0.7) ** 2) / 0.018);
  return (plates + fibres + layers - furrows * 0.16 + knots * 0.04) * Math.min(1, depth / 0.1);
}

export function trunkRadius(angle: number, radius: number): number {
  return (
    radius +
    edgeNoise(angle, 7, 11) * 0.58 +
    edgeNoise(angle, 19, 23) * 0.2 +
    edgeNoise(angle, 61, 37) * 0.065 +
    edgeNoise(angle, 127, 53) * 0.025 -
    groove(angle, -2.75, 0.052) * 0.2 -
    groove(angle, -2.32, 0.073) * 0.28 -
    groove(angle, -1.61, 0.18) * 0.47 -
    groove(angle, -0.96, 0.054) * 0.2 -
    groove(angle, -0.35, 0.09) * 0.28 -
    groove(angle, 0.53, 0.13) * 0.45 -
    groove(angle, 1.39, 0.052) * 0.26 -
    groove(angle, 2.55, 0.18) * 0.52 -
    groove(angle, 3.06, 0.062) * 0.18
  );
}

export function createTrunkTable(
  radius: number,
  bevel: number,
): {
  top: CircleGeometry;
  edge: LatheGeometry;
} {
  const thickness = 0.64;
  const top = new CircleGeometry(radius - bevel, SEGMENTS);
  const edge = new LatheGeometry(
    [
      new Vector2(radius - 0.1, -thickness),
      new Vector2(radius - 0.03, -thickness + 0.025),
      new Vector2(radius, -thickness + 0.09),
      ...Array.from(
        { length: 11 },
        (_, idx): Vector2 =>
          new Vector2(radius, -thickness + 0.09 + ((thickness - 0.18) * (idx + 1)) / 12),
      ),
      new Vector2(radius, -0.09),
      new Vector2(radius - 0.02, -0.025),
      new Vector2(radius - bevel, 0),
    ],
    SEGMENTS,
  );

  for (const [geometry, flat] of [
    [top, true],
    [edge, false],
  ] as const) {
    const positions = geometry.getAttribute("position");
    const uv = geometry.getAttribute("uv");
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      const x = positions.getX(vertex);
      const z = flat ? -positions.getY(vertex) : positions.getZ(vertex);
      const originalRadius = Math.hypot(x, z);
      if (originalRadius < 0.1) continue;
      const angle = Math.atan2(-z, x);
      const y = positions.getY(vertex);
      const bark = flat ? 0 : barkRelief(angle, -y / thickness);
      const naturalRadius = originalRadius + trunkRadius(angle, radius) - radius + bark;
      const scale = naturalRadius / originalRadius;
      if (flat) {
        positions.setXY(vertex, x * scale, -z * scale);
        uv.setXY(vertex, 0.5 + (x * scale) / (2 * radius), 0.5 - (z * scale) / (2 * radius));
      } else {
        positions.setXYZ(vertex, x * scale, y, z * scale);
        uv.setXY(vertex, uv.getX(vertex), (y + thickness) / thickness);
      }
    }
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }
  weldTrunkEdge(edge);
  return { top, edge };
}

export function weldTrunkEdge(edge: LatheGeometry): void {
  const normals = edge.getAttribute("normal");
  const rows = edge.parameters.points.length;
  for (let row = 0; row < rows; row += 1) {
    const last = edge.parameters.segments * rows + row;
    const x = normals.getX(row) + normals.getX(last);
    const y = normals.getY(row) + normals.getY(last);
    const z = normals.getZ(row) + normals.getZ(last);
    const length = Math.hypot(x, y, z) || 1;
    normals.setXYZ(row, x / length, y / length, z / length);
    normals.setXYZ(last, x / length, y / length, z / length);
  }
  normals.needsUpdate = true;
}

export function createTrunkBarkTexture(): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create trunk bark texture");
  const image = context.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const u = (x / (canvas.width - 1)) * FULL_TURN - Math.PI / 2;
      const v = y / (canvas.height - 1);
      const relief = barkRelief(u, v);
      const flecks = Math.sin(Math.sin(u * 977 + v * 127.1) * 43758.5453) * 0.035;
      const knotX = Math.atan2(Math.sin(u + 1.1), Math.cos(u + 1.1)) / 0.025;
      const knotY = (v - 0.54) / 0.22;
      const knotRadius = Math.hypot(knotX, knotY);
      const knot = Math.exp(-knotRadius * knotRadius * 1.3);
      const tone =
        0.56 +
        edgeNoise(u + v * 0.03, 21, 23) * 0.16 +
        relief * 3.5 +
        edgeNoise(u + v * 0.021, 317, 79) * 0.065 +
        (Math.cos(knotRadius * 20) * 0.08 - 0.075) * knot +
        flecks;
      const band = Math.max(0, 1 - v / 0.055);
      const lichen =
        Math.min(
          0.24,
          Math.max(0, edgeNoise(u + v * 0.13, 37, 83) - 0.56) *
            Math.max(0, edgeNoise(u - v * 0.07, 11, 41) - 0.3) *
            15,
        ) *
        (1 - band);
      const red = (65 + tone * 110) * (1 - band) + 178 * band;
      const green = (47 + tone * 82) * (1 - band) + 139 * band;
      const blue = (29 + tone * 54) * (1 - band) + 91 * band;
      const pixel = (y * canvas.width + x) * 4;
      image.data[pixel] = red * (1 - lichen) + 149 * lichen;
      image.data[pixel + 1] = green * (1 - lichen) + 150 * lichen;
      image.data[pixel + 2] = blue * (1 - lichen) + 113 * lichen;
      image.data[pixel + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = ClampToEdgeWrapping;
  texture.anisotropy = 8;
  return texture;
}
