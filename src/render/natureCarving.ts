import { CanvasTexture, RepeatWrapping } from "three";

const FACE_WIDTH = 512;
const HEIGHT = 1024;
type Groove = (path: Path2D, width: number) => void;

export function createNatureCarvingTexture(variant: "forest" | "ocean" = "forest"): CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = FACE_WIDTH * 4;
  canvas.height = HEIGHT;
  const texture = new CanvasTexture(canvas);
  texture.channel = 1;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  const context = canvas.getContext("2d");
  if (!context) return texture;
  context.fillStyle = "#c7c7c7";
  context.fillRect(0, 0, canvas.width, HEIGHT);
  context.lineCap = "round";
  context.lineJoin = "round";

  const groove = (path: Path2D, width: number): void => {
    for (const [extra, colour] of [
      [8, "#dddddd"],
      [2, "#969696"],
      [-4, "#767676"],
      [-10, "#565656"],
      [-16, "#363636"],
    ] as const) {
      context.lineWidth = Math.max(3, width + extra);
      context.strokeStyle = colour;
      context.stroke(path);
    }
  };

  if (variant === "ocean") {
    drawCarving(context, canvas.width, groove);
  } else {
    for (const offset of [-29, 0, 29]) {
      const ribbon = new Path2D();
      for (let x = -FACE_WIDTH; x <= canvas.width + FACE_WIDTH; x += 8) {
        const y = 454 + offset + 112 * Math.sin((x / FACE_WIDTH) * Math.PI * 2);
        if (x === -FACE_WIDTH) ribbon.moveTo(x, y);
        else ribbon.lineTo(x, y);
      }
      groove(ribbon, 26);
    }

    for (let side = 0; side < 4; side += 1) {
      const start = side * FACE_WIDTH;
      const spiral = new Path2D();
      spiral.moveTo(start + 132, 503);
      spiral.bezierCurveTo(start + 88, 355, start + 263, 209, start + 290, 275);
      for (let step = 0; step <= 100; step += 1) {
        const t = step / 100;
        const angle = -Math.PI / 2 + t * Math.PI * 2.65;
        const radius = 122 * (1 - t) ** 0.9 + 9;
        spiral.lineTo(start + 290 + Math.cos(angle) * radius, 406 + Math.sin(angle) * radius);
      }
      groove(spiral, 32);

      for (let leaf = 0; leaf < 3; leaf += 1) {
        const x = start + 88 + leaf * 96;
        const y = 594 - leaf * 15;
        const blade = new Path2D();
        blade.moveTo(x, y);
        blade.bezierCurveTo(x + 15, y + 43, x + 91, y + 24, x + 110, y - 14);
        blade.bezierCurveTo(x + 71, y - 19, x + 29, y - 30, x, y);
        context.fillStyle = "#707070";
        context.fill(blade);
        groove(blade, 22);
        const vein = new Path2D();
        vein.moveTo(x + 15, y);
        vein.quadraticCurveTo(x + 57, y + 6, x + 89, y - 7);
        groove(vein, 11);
      }

      for (const y of [166, 692]) {
        for (let x = start + 8; x < start + FACE_WIDTH; x += 64) {
          const notch = new Path2D();
          notch.moveTo(x, y - 14);
          notch.lineTo(x + 24, y + 14);
          notch.lineTo(x + 48, y - 14);
          groove(notch, 17);
        }
      }
    }
  }

  for (let side = 0; side < 4; side += 1) {
    drawKiwi(context, side * FACE_WIDTH + FACE_WIDTH / 2 - 20, 834, groove);
  }

  for (const y of [118, 213, 660, 724, 965]) {
    const border = new Path2D();
    border.moveTo(-24, y);
    border.lineTo(canvas.width + 24, y);
    groove(border, 12);
  }
  texture.needsUpdate = true;
  return texture;
}

function drawCarving(context: CanvasRenderingContext2D, width: number, groove: Groove): void {
  for (const centre of [276, 605]) {
    for (const offset of [-19, 0, 19]) {
      const cur = new Path2D();
      for (let x = -FACE_WIDTH; x <= width + FACE_WIDTH; x += 8) {
        const y = centre + offset + 22 * Math.sin((x / FACE_WIDTH) * Math.PI * 2);
        if (x === -FACE_WIDTH) cur.moveTo(x, y);
        else cur.lineTo(x, y);
      }
      groove(cur, 17);
    }
  }

  for (const centre of [166, 692]) {
    for (const dir of [-1, 1]) {
      const weave = new Path2D();
      for (let x = -64; x <= width + 64; x += 4) {
        const y = centre + dir * 15 * Math.sin((x / 64) * Math.PI * 2);
        if (x === -64) weave.moveTo(x, y);
        else weave.lineTo(x, y);
      }
      groove(weave, 11);
    }
  }

  for (let side = 0; side < 4; side += 1) {
    const start = side * FACE_WIDTH;
    const crest = new Path2D();
    crest.moveTo(start + 64, 290);
    crest.bezierCurveTo(start + 92, 296, start + 96, 233, start + 137, 235);
    crest.bezierCurveTo(start + 176, 237, start + 186, 276, start + 161, 289);
    crest.bezierCurveTo(start + 143, 299, start + 124, 282, start + 134, 268);
    crest.quadraticCurveTo(start + 145, 252, start + 158, 266);
    groove(crest, 21);

    context.save();
    context.translate(start + FACE_WIDTH / 2, 429);
    if (side % 2 === 1) context.scale(-1, 1);
    drawWhale(context, groove);
    context.restore();
  }
}

function drawWhale(context: CanvasRenderingContext2D, groove: Groove): void {
  const whale = new Path2D();
  whale.moveTo(-118, -12);
  whale.bezierCurveTo(-86, -37, -43, -65, -13, -59);
  whale.quadraticCurveTo(-8, -82, 12, -93);
  whale.quadraticCurveTo(9, -65, 30, -52);
  whale.bezierCurveTo(75, -43, 119, -42, 147, -18);
  whale.bezierCurveTo(170, -4, 177, 19, 152, 34);
  whale.bezierCurveTo(120, 55, 61, 52, 24, 37);
  whale.bezierCurveTo(-11, 48, -75, 24, -124, 8);
  whale.lineTo(-174, 41);
  whale.bezierCurveTo(-177, 19, -160, 1, -139, -8);
  whale.bezierCurveTo(-161, -24, -176, -44, -170, -65);
  whale.bezierCurveTo(-144, -41, -126, -33, -118, -12);
  whale.closePath();
  context.fillStyle = "#ababab";
  context.fill(whale);
  groove(whale, 26);

  const flipper = new Path2D();
  flipper.moveTo(20, 26);
  flipper.bezierCurveTo(-1, 58, 0, 84, 31, 103);
  flipper.bezierCurveTo(52, 91, 55, 53, 47, 35);
  context.fillStyle = "#b0b0b0";
  context.fill(flipper);
  groove(flipper, 19);

  const jaw = new Path2D();
  jaw.moveTo(150, 15);
  jaw.bezierCurveTo(127, 29, 91, 30, 66, 24);
  groove(jaw, 10);
  for (let pleat = 0; pleat < 4; pleat += 1) {
    const throat = new Path2D();
    throat.moveTo(133 - pleat * 15, 29);
    throat.quadraticCurveTo(111 - pleat * 17, 48, 62 - pleat * 9, 40);
    groove(throat, 8);
  }
  const eye = new Path2D();
  eye.arc(126, 3, 4, 0, Math.PI * 2);
  context.fillStyle = "#414141";
  context.fill(eye);
}

function drawKiwi(context: CanvasRenderingContext2D, x: number, y: number, groove: Groove): void {
  const body = new Path2D();
  body.moveTo(x - 118, y + 5);
  body.bezierCurveTo(x - 138, y - 41, x - 105, y - 83, x - 59, y - 87);
  body.bezierCurveTo(x - 11, y - 94, x + 25, y - 61, x + 48, y - 36);
  body.bezierCurveTo(x + 54, y - 59, x + 75, y - 67, x + 92, y - 53);
  body.bezierCurveTo(x + 113, y - 39, x + 111, y - 19, x + 94, y - 10);
  body.bezierCurveTo(x + 77, y - 5, x + 67, y + 16, x + 47, y + 32);
  body.bezierCurveTo(x + 17, y + 62, x - 94, y + 62, x - 118, y + 5);
  body.closePath();
  context.fillStyle = "#858585";
  context.fill(body);
  groove(body, 23);

  const bill = new Path2D();
  bill.moveTo(x + 105, y - 33);
  bill.quadraticCurveTo(x + 151, y - 10, x + 179, y + 15);
  groove(bill, 12);

  const nearLeg = new Path2D();
  nearLeg.moveTo(x + 15, y + 45);
  nearLeg.lineTo(x + 22, y + 72);
  nearLeg.lineTo(x + 52, y + 103);
  nearLeg.lineTo(x + 89, y + 103);
  nearLeg.moveTo(x + 52, y + 103);
  nearLeg.lineTo(x + 78, y + 92);
  nearLeg.moveTo(x + 52, y + 103);
  nearLeg.lineTo(x + 77, y + 114);
  groove(nearLeg, 13);
  const farLeg = new Path2D();
  farLeg.moveTo(x - 36, y + 43);
  farLeg.lineTo(x - 45, y + 70);
  farLeg.lineTo(x - 80, y + 85);
  farLeg.lineTo(x - 111, y + 76);
  farLeg.moveTo(x - 80, y + 85);
  farLeg.lineTo(x - 104, y + 95);
  groove(farLeg, 12);

  for (let feather = 0; feather < 5; feather += 1) {
    const cut = new Path2D();
    cut.moveTo(x - 101 + feather * 24, y - 35 - Math.sin(feather * 0.7) * 24);
    cut.quadraticCurveTo(x - 76 + feather * 25, y + 10, x - 64 + feather * 23, y + 31);
    groove(cut, 8);
  }
  const eye = new Path2D();
  eye.arc(x + 86, y - 36, 4, 0, Math.PI * 2);
  context.fillStyle = "#414141";
  context.fill(eye);
}

export function squareCarvingU(x: number, z: number): number {
  const extent = Math.max(Math.abs(x), Math.abs(z), 0.0001);
  if (Math.abs(z) >= Math.abs(x)) {
    return z >= 0 ? 0.125 + (x / extent) * 0.125 : 0.625 - (x / extent) * 0.125;
  }
  return x >= 0 ? 0.375 - (z / extent) * 0.125 : 0.875 + (z / extent) * 0.125;
}
