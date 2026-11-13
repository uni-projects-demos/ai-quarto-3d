import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

export function createWoodCanvas(): HTMLCanvasElement {
  const cvs: HTMLCanvasElement = document.createElement("canvas");
  cvs.width = 512;
  cvs.height = 512;
  return cvs;
}

export function createWoodTexture(): CanvasTexture {
  const cvs: HTMLCanvasElement = createWoodCanvas();
  const tex: CanvasTexture = new CanvasTexture(cvs);
  tex.colorSpace = SRGBColorSpace;
  const ctx: CanvasRenderingContext2D | null = cvs.getContext("2d");
  if (!ctx) return tex;

  const grad: CanvasGradient = ctx.createLinearGradient(0, 0, cvs.width, cvs.height);
  grad.addColorStop(0, "#6a4322");
  grad.addColorStop(0.5, "#4f3118");
  grad.addColorStop(1, "#86562e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, cvs.width, cvs.height);

  ctx.globalAlpha = 0.16;
  for (let y: number = 0; y < cvs.height; y += 4) {
    const wobble: number = 9 * Math.sin(y / 22) + 4 * Math.sin(y / 9);
    ctx.fillStyle = y % 8 === 0 ? "#362010" : "#7c4a24";
    ctx.fillRect(0, y + wobble * 0.05, cvs.width, 2);
  }

  ctx.globalAlpha = 0.09;
  for (let line: number = 0; line < 95; line += 1) {
    const y: number = Math.random() * cvs.height;
    const amp: number = 2 + Math.random() * 8;
    const freq: number = 35 + Math.random() * 70;
    const phase: number = Math.random() * Math.PI * 2;

    ctx.beginPath();
    ctx.strokeStyle = line % 3 === 0 ? "#2c180c" : "#c09058";
    ctx.lineWidth = 0.5 + Math.random() * 1.4;

    for (let x: number = -20; x <= cvs.width + 20; x += 8) {
      const grainY: number = y + Math.sin(x / freq + phase) * amp;
      if (x === -20) ctx.moveTo(x, grainY);
      else ctx.lineTo(x, grainY);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}
