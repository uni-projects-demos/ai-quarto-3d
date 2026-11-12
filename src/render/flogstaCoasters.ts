import { CanvasTexture, CylinderGeometry, SRGBColorSpace } from "three";

export function createCoasterGeom(): CylinderGeometry {
  const geom = new CylinderGeometry(0.53, 0.53, 0.028, 64);
  const pos = geom.getAttribute("position");
  const uv = geom.getAttribute("uv");
  for (let vtx = 0; vtx < pos.count; vtx += 1) {
    const x = pos.getX(vtx);
    const z = pos.getZ(vtx);
    const ang = Math.atan2(z, x);
    const fray = 0.996 + 0.004 * Math.sin(ang * 17 + Math.sin(ang * 7));
    pos.setX(vtx, x * fray);
    pos.setZ(vtx, z * fray);
    if (Math.abs(geom.getAttribute("normal").getY(vtx)) > 0.5) {
      uv.setXY(vtx, 0.5 + (x * fray) / 1.06, 0.5 - (z * fray) / 1.06);
    } else uv.setY(vtx, 0.015);
  }
  geom.translate(0, 0.046, 0);
  geom.computeVertexNormals();
  return geom;
}

export function createCoasterTexture(col: number, ink: number): CanvasTexture {
  const size = 512;
  const cvs = document.createElement("canvas");
  cvs.width = size;
  cvs.height = size;
  const ctx = cvs.getContext("2d");
  if (!ctx) throw new Error("Could not create pub coaster texture");
  const img = ctx.createImageData(size, size);
  const paper = [178, 164, 133] as const;
  const paint = [col >> 16, (col >> 8) & 255, col & 255];
  const ofs = Math.random() * 1000;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const rad = Math.hypot(x - size / 2, y - size / 2);
      const noise = Math.random();
      const patch = Math.sin((x + ofs) / 47) * Math.cos((y + ofs) / 59);
      const printed = rad < 245 - noise * 5 && (rad < 229 || noise > 0.3);
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
  ctx.putImageData(img, 0, 0);
  ctx.fillStyle = `#${ink.toString(16).padStart(6, "0")}`;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.globalAlpha = 0.82;
  ctx.textAlign = "center";
  ctx.font = "bold 64px Georgia, serif";
  ctx.fillText("FLOGSTA", size / 2, 158);
  ctx.lineWidth = 10;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.roundRect(207, 227, 88, 91, 8);
  ctx.moveTo(295, 239);
  ctx.bezierCurveTo(344, 228, 344, 302, 295, 293);
  ctx.moveTo(229, 244);
  ctx.lineTo(229, 299);
  ctx.moveTo(270, 244);
  ctx.lineTo(270, 299);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(204, 226);
  ctx.bezierCurveTo(190, 203, 217, 194, 232, 206);
  ctx.bezierCurveTo(237, 179, 270, 181, 275, 203);
  ctx.bezierCurveTo(299, 190, 315, 215, 297, 226);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let fibre = 0; fibre < 6500; fibre += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.strokeStyle = fibre % 3 === 0 ? "rgba(65, 55, 36, 0.17)" : "rgba(213, 201, 169, 0.3)";
    ctx.lineWidth = 0.5 + Math.random();
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.random() * 6 - 3, y + Math.random() * 4);
    ctx.stroke();
  }
  for (let stain = 0; stain < 6; stain += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rad = 22 + Math.random() * 65;
    const blotch = ctx.createRadialGradient(x, y, 0, x, y, rad);
    blotch.addColorStop(0, "rgba(73, 48, 23, 0.23)");
    blotch.addColorStop(1, "transparent");
    ctx.fillStyle = blotch;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  const tex = new CanvasTexture(cvs);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
