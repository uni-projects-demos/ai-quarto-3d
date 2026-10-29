import { CanvasTexture, CylinderGeometry, SRGBColorSpace } from "three";

export function createCoasterGeom(): CylinderGeometry {
  const geom = new CylinderGeometry(0.53, 0.53, 0.028, 64);
  const pos = geom.getAttribute("position");
  const uv = geom.getAttribute("uv");
  for (let vertex = 0; vertex < pos.count; vertex += 1) {
    const x = pos.getX(vertex);
    const z = pos.getZ(vertex);
    const angle = Math.atan2(z, x);
    const fray = 0.996 + 0.004 * Math.sin(angle * 17 + Math.sin(angle * 7));
    pos.setX(vertex, x * fray);
    pos.setZ(vertex, z * fray);
    if (Math.abs(geom.getAttribute("normal").getY(vertex)) > 0.5) {
      uv.setXY(vertex, 0.5 + (x * fray) / 1.06, 0.5 - (z * fray) / 1.06);
    } else uv.setY(vertex, 0.015);
  }
  geom.translate(0, 0.046, 0);
  geom.computeVertexNormals();
  return geom;
}

export function createCoasterTexture(col: number, ink: number): CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create pub coaster texture");
  const img = context.createImageData(size, size);
  const paper = [178, 164, 133] as const;
  const paint = [col >> 16, (col >> 8) & 255, col & 255];
  const offset = Math.random() * 1000;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const radius = Math.hypot(x - size / 2, y - size / 2);
      const noise = Math.random();
      const patch = Math.sin((x + offset) / 47) * Math.cos((y + offset) / 59);
      const printed = radius < 245 - noise * 5 && (radius < 229 || noise > 0.3);
      const pixel = (y * size + x) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        img.data[pixel + channel] =
          (printed ? (paint[channel] ?? 0) : (paper[channel] ?? 0)) +
          (noise - 0.5) * 24 +
          patch * 8;
      }
      img.data[pixel + 3] = 255;
    }
  }
  context.putImageData(img, 0, 0);
  context.fillStyle = `#${ink.toString(16).padStart(6, "0")}`;
  context.strokeStyle = context.fillStyle;
  context.globalAlpha = 0.82;
  context.textAlign = "center";
  context.font = "bold 64px Georgia, serif";
  context.fillText("FLOGSTA", size / 2, 158);
  context.lineWidth = 10;
  context.lineJoin = "round";
  context.beginPath();
  context.roundRect(207, 227, 88, 91, 8);
  context.moveTo(295, 239);
  context.bezierCurveTo(344, 228, 344, 302, 295, 293);
  context.moveTo(229, 244);
  context.lineTo(229, 299);
  context.moveTo(270, 244);
  context.lineTo(270, 299);
  context.stroke();
  context.beginPath();
  context.moveTo(204, 226);
  context.bezierCurveTo(190, 203, 217, 194, 232, 206);
  context.bezierCurveTo(237, 179, 270, 181, 275, 203);
  context.bezierCurveTo(299, 190, 315, 215, 297, 226);
  context.closePath();
  context.fill();
  context.globalAlpha = 1;
  for (let fibre = 0; fibre < 6500; fibre += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    context.strokeStyle = fibre % 3 === 0 ? "rgba(65, 55, 36, 0.17)" : "rgba(213, 201, 169, 0.3)";
    context.lineWidth = 0.5 + Math.random();
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + Math.random() * 6 - 3, y + Math.random() * 4);
    context.stroke();
  }
  for (let stain = 0; stain < 6; stain += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = 22 + Math.random() * 65;
    const blotch = context.createRadialGradient(x, y, 0, x, y, radius);
    blotch.addColorStop(0, "rgba(73, 48, 23, 0.23)");
    blotch.addColorStop(1, "transparent");
    context.fillStyle = blotch;
    context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
