import type { BunkMotionFrame } from "./bunkMotion";

const VIEW_SCALE = {
  board: { rollX: 0.78, yawX: 0.22, pitchY: 0.05, pitchZ: 0.46, rollZ: -0.08 },
  hull: { roll: 73, yawX: 145, heaveY: 90, pitchY: 65 },
  water: { roll: -125, yawX: -195, crossX: 5, heaveY: -210, pitchY: -175 },
  surface: { crossX: 23, surgeY: 7, surgeIntensityY: 17 },
  foam: { foamX: 18, crossX: 11, surgeY: 13, foamY: -7 },
  bed: { roll: 72, rollX: 190, heaveY: 240, pitchY: 110, rollDepth: -24, pitchDepth: -18 },
} as const;

export const BUNK_CSS_PROPS = [
  "--bunk-hull-roll",
  "--bunk-hull-x",
  "--bunk-hull-y",
  "--bunk-water-roll",
  "--bunk-water-x",
  "--bunk-water-y",
  "--bunk-surface-x",
  "--bunk-surface-y",
  "--bunk-foam-x",
  "--bunk-foam-y",
  "--bunk-crest-opacity",
  "--bunk-bed-roll",
  "--bunk-bed-x",
  "--bunk-bed-y",
  "--bunk-bed-depth",
] as const;

export type BunkCssProp = (typeof BUNK_CSS_PROPS)[number];

export interface BunkVisualFrame {
  readonly board: Readonly<{
    x: number;
    y: number;
    z: number;
    pitch: number;
    yaw: number;
    roll: number;
  }>;
  readonly css: Readonly<Record<BunkCssProp, string>>;
}

function px(val: number): string {
  return `${val.toFixed(2)}px`;
}

function deg(val: number): string {
  return `${val.toFixed(3)}deg`;
}

function screenY(worldPx: number): string {
  return px(-worldPx);
}

function screenRoll(worldDeg: number): string {
  return deg(-worldDeg);
}

export function bunkVisualFrame(
  motion: BunkMotionFrame,
  boardX: number,
  boardZ: number,
  baseY: number,
): BunkVisualFrame {
  const { sea, lowerBunk: lower, surface } = motion;
  const { board, hull, water, foam, bed } = VIEW_SCALE;
  const wave = VIEW_SCALE.surface;

  return {
    board: {
      x: boardX + motion.roll * board.rollX + motion.yaw * board.yawX,
      y: baseY + motion.heave + motion.pitch * board.pitchY,
      z: boardZ + motion.pitch * board.pitchZ + motion.roll * board.rollZ,
      pitch: motion.pitch,
      yaw: motion.yaw,
      roll: motion.roll,
    },
    css: {
      "--bunk-hull-roll": screenRoll(sea.roll * hull.roll),
      "--bunk-hull-x": px(sea.yaw * hull.yawX),
      "--bunk-hull-y": screenY(sea.heave * hull.heaveY + sea.pitch * hull.pitchY),
      "--bunk-water-roll": screenRoll(sea.roll * water.roll),
      "--bunk-water-x": px(sea.yaw * water.yawX + surface.cross * water.crossX),
      "--bunk-water-y": screenY(sea.heave * water.heaveY + sea.pitch * water.pitchY),
      "--bunk-surface-x": px(surface.cross * wave.crossX),
      "--bunk-surface-y": px(
        surface.surge * (wave.surgeY + surface.intensity * wave.surgeIntensityY),
      ),
      "--bunk-foam-x": px(surface.foam * foam.foamX + surface.cross * foam.crossX),
      "--bunk-foam-y": px(surface.surge * foam.surgeY + surface.foam * foam.foamY),
      "--bunk-crest-opacity": (0.2 + surface.intensity * 0.24).toFixed(3),
      "--bunk-bed-roll": screenRoll(lower.roll * bed.roll),
      "--bunk-bed-x": px(lower.roll * bed.rollX),
      "--bunk-bed-y": px(-lower.heave * bed.heaveY + lower.pitch * bed.pitchY),
      "--bunk-bed-depth": px(
        Math.abs(lower.roll) * bed.rollDepth + Math.abs(lower.pitch) * bed.pitchDepth,
      ),
    },
  };
}
