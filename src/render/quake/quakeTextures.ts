import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";

function random(seed: number): () => number {
  let state: number = seed >>> 0;
  return (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function makeTexture(size: number, paint: (ctx: CanvasRenderingContext2D) => void): CanvasTexture {
  const canvas: HTMLCanvasElement = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d");
  if (ctx) paint(ctx);
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.wrapS = RepeatWrapping;
  tex.wrapT = RepeatWrapping;
  return tex;
}

export function createQuakePlasticTexture(): CanvasTexture {
  return makeTexture(1024, (ctx: CanvasRenderingContext2D): void => {
    const rand: () => number = random(20100222);
    const img: ImageData = ctx.createImageData(1024, 1024);
    for (let y: number = 0; y < 1024; y += 1) {
      for (let x: number = 0; x < 1024; x += 1) {
        const i: number = (y * 1024 + x) * 4;
        const radius: number = Math.hypot(x - 512, y - 512) / 512;
        const edgeDirt: number = Math.max(0, (radius - 0.65) / 0.35);
        const stain: number =
          10 * Math.max(0, Math.sin(x * 0.012 + y * 0.006) * Math.sin(y * 0.017 - x * 0.009)) +
          8 * Math.max(0, Math.sin(x * 0.031) * Math.cos(y * 0.025));
        const noise: number = (rand() - 0.5) * 21;
        const grime: number = edgeDirt * 29 + stain;
        img.data[i] = Math.max(0, 229 + noise - grime);
        img.data[i + 1] = Math.max(0, 226 + noise - grime * 1.03);
        img.data[i + 2] = Math.max(0, 216 + noise - grime * 1.17);
        img.data[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    for (let ring: number = 0; ring < 9; ring += 1) {
      ctx.beginPath();
      const r: number = 170 + ring * 34;
      ctx.ellipse(512, 512, r, r * (0.992 + rand() * 0.018), 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(89, 79, 64, ${0.025 + rand() * 0.065})`;
      ctx.lineWidth = 0.8 + rand() * 2;
      ctx.stroke();
    }
    for (let k: number = 0; k < 550; k += 1) {
      const x: number = rand() * 1024;
      const y: number = rand() * 1024;
      const length: number = 1 + rand() ** 2 * 65;
      ctx.strokeStyle = rand() < 0.47 ? "rgba(93, 80, 66, 0.12)" : "rgba(255, 255, 243, 0.21)";
      ctx.lineWidth = 0.4 + rand() * 1.1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + length * (rand() < 0.5 ? 1 : -1), y + length * (rand() - 0.5) * 0.35);
      ctx.stroke();
    }
    for (let mark: number = 0; mark < 24; mark += 1) {
      const x: number = rand() * 1024;
      const y: number = rand() * 1024;
      const r: number = 3 + rand() * 35;
      const halo: CanvasGradient = ctx.createRadialGradient(x, y, 0, x, y, r);
      halo.addColorStop(0, "rgba(86, 77, 54, 0.2)");
      halo.addColorStop(1, "rgba(86, 77, 54, 0)");
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function createQuakeBoardTexture(): CanvasTexture {
  return makeTexture(512, (ctx: CanvasRenderingContext2D): void => {
    const rand: () => number = random(20100904);
    ctx.fillStyle = "#e6e0dc";
    ctx.fillRect(0, 0, 512, 512);
    for (let i: number = 0; i < 13000; i += 1) {
      const d: number = Math.floor(2 + rand() * 7);
      ctx.fillStyle = rand() < 0.5 ? "rgba(28, 23, 23, 0.11)" : "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(rand() * 512, rand() * 512, d / 2, d / 2);
    }
    for (let i: number = 0; i < 24; i += 1) {
      ctx.strokeStyle = `rgba(32, 25, 25, ${0.08 + rand() * 0.12})`;
      ctx.lineWidth = 0.5 + rand() * 1.5;
      ctx.beginPath();
      const x: number = rand() * 512;
      const y: number = rand() * 512;
      ctx.moveTo(x, y);
      ctx.lineTo(x + rand() * 70, y - rand() * 40);
      ctx.lineTo(x + rand() * 100, y - rand() * 70);
      ctx.stroke();
    }
  });
}

export function createQuakeBrickTexture(): CanvasTexture {
  return makeTexture(512, (ctx: CanvasRenderingContext2D): void => {
    const rand: () => number = random(20110222);
    ctx.fillStyle = "#f1e9dd";
    ctx.fillRect(0, 0, 512, 512);

    for (let i: number = 0; i < 23000; i += 1) {
      const size: number = 0.4 + rand() * 2.7;
      const r: number = rand();
      ctx.fillStyle =
        r < 0.37
          ? "rgba(92, 44, 31, 0.22)"
          : r < 0.71
            ? "rgba(255, 244, 222, 0.47)"
            : "rgba(69, 57, 46, 0.13)";
      ctx.fillRect(rand() * 512, rand() * 512, size, size * (0.7 + rand()));
    }

    for (let patch: number = 0; patch < 125; patch += 1) {
      const x: number = rand() * 512;
      const y: number = rand() * 512;
      const rx: number = 6 + rand() * 28;
      const ry: number = 2 + rand() * 17;
      const shade: CanvasGradient = ctx.createRadialGradient(x, y, 0, x, y, rx);
      shade.addColorStop(0, rand() < 0.5 ? "rgba(132, 58, 35, 0.13)" : "rgba(255, 244, 222, 0.27)");
      shade.addColorStop(1, "rgba(255, 244, 222, 0)");
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    for (let chip: number = 0; chip < 90; chip += 1) {
      const x: number = rand() * 512;
      const y: number = rand() * 512;
      const w: number = 2 + rand() * 16;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w * 0.35, y - w * (0.2 + rand() * 0.25));
      ctx.lineTo(x + w, y + w * 0.1);
      ctx.lineTo(x + w * 0.55, y + w * 0.42);
      ctx.closePath();
      ctx.fillStyle = "rgba(255, 243, 218, 0.44)";
      ctx.fill();
      ctx.strokeStyle = "rgba(65, 39, 28, 0.24)";
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }

    for (let crack: number = 0; crack < 33; crack += 1) {
      let x: number = rand() * 512;
      let y: number = rand() * 512;
      const dx: number = (rand() - 0.5) * 17;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let step: number = 0; step < 4; step += 1) {
        x += dx + (rand() - 0.5) * 10;
        y += 5 + rand() * 11;
        ctx.lineTo(x, y);
      }
      ctx.lineWidth = 0.6 + rand() * 1.1;
      ctx.strokeStyle = "rgba(62, 37, 27, 0.36)";
      ctx.stroke();
    }
  });
}

export function createQuakeCardboardTexture(): CanvasTexture {
  return makeTexture(512, (ctx: CanvasRenderingContext2D): void => {
    const rand: () => number = random(20130806);
    ctx.fillStyle = "#f0e3ca";
    ctx.fillRect(0, 0, 512, 512);

    for (let i: number = 0; i < 16000; i += 1) {
      const x: number = rand() * 512;
      const y: number = rand() * 512;
      ctx.fillStyle = rand() < 0.65 ? "rgba(91, 70, 42, 0.13)" : "rgba(255, 255, 236, 0.34)";
      ctx.fillRect(x, y, 0.3 + rand() * 3, 0.4 + rand() * 1.3);
    }

    for (let y: number = 0; y < 512; y += 9) {
      const spacing: number = y + rand() * 2;
      ctx.fillStyle = "rgba(79, 59, 36, 0.21)";
      ctx.fillRect(0, spacing, 512, 1.35);
      ctx.fillStyle = "rgba(255, 247, 217, 0.4)";
      ctx.fillRect(0, spacing + 2.4, 512, 1.2);
      ctx.fillStyle = "rgba(112, 80, 50, 0.06)";
      ctx.fillRect(0, spacing + 4.8, 512, 1.5);
    }

    for (let line: number = 0; line < 11; line += 1) {
      const x: number = rand() * 512;
      const drift: number = (rand() - 0.5) * 12;
      ctx.beginPath();
      ctx.moveTo(x, -15);
      ctx.bezierCurveTo(x + drift, 125, x - drift, 340, x + drift, 525);
      ctx.strokeStyle = line < 2 ? "rgba(83, 58, 34, 0.16)" : "rgba(94, 68, 39, 0.055)";
      ctx.lineWidth = line < 2 ? 1.6 : 0.7;
      ctx.stroke();
    }
    for (let mark: number = 0; mark < 95; mark += 1) {
      ctx.fillStyle = rand() > 0.5 ? "rgba(92, 60, 31, 0.1)" : "rgba(255, 250, 226, 0.23)";
      ctx.fillRect(rand() * 512, rand() * 512, 2 + rand() * 26, 0.5 + rand() * 1.5);
    }
  });
}
