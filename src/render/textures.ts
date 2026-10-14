import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

export function createWoodTexture(): CanvasTexture {
  const canvas: HTMLCanvasElement = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;

  const context = canvas.getContext("2d");
  if (!context) return texture;

  const gradient: CanvasGradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#6a4322");
  gradient.addColorStop(0.5, "#4f3118");
  gradient.addColorStop(1, "#86562e");
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.globalAlpha = 0.16;
  for (let y: number = 0; y < canvas.height; y += 4) {
    const wobble: number = 9 * Math.sin(y / 22) + 4 * Math.sin(y / 9);
    context.fillStyle = y % 8 === 0 ? "#362010" : "#7c4a24";
    context.fillRect(0, y + wobble * 0.05, canvas.width, 2);
  }

  context.globalAlpha = 0.09;
  for (let line: number = 0; line < 95; line += 1) {
    const y: number = Math.random() * canvas.height;
    const amplitude: number = 2 + Math.random() * 8;
    const frequency: number = 35 + Math.random() * 70;
    const phase: number = Math.random() * Math.PI * 2;

    context.beginPath();
    context.strokeStyle = line % 3 === 0 ? "#2c180c" : "#c09058";
    context.lineWidth = 0.5 + Math.random() * 1.4;

    for (let x: number = -20; x <= canvas.width + 20; x += 8) {
      const grainY: number = y + Math.sin(x / frequency + phase) * amplitude;
      if (x === -20) context.moveTo(x, grainY);
      else context.lineTo(x, grainY);
    }
    context.stroke();
  }
  context.globalAlpha = 1;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}
