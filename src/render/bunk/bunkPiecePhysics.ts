import { GAME_PIECES } from "../../game/pieces";
import type { PcId } from "../../game/types";
import type { BunkMotionFrame } from "./bunkMotion";

export interface BunkPiecePose {
  readonly x: number;
  readonly z: number;
  readonly lift: number;
  readonly pitch: number;
  readonly roll: number;
}

type Axis = "x" | "z" | "lift" | "pitch" | "roll";

type PieceSpring = {
  [K in Axis]: number;
} & {
  readonly velocity: Record<Axis, number>;
};

const MAX_STEP_SECS: number = 0.1;
const SUBSTEP_SECS: number = 1 / 120;
const MAX_SLIDE: number = 0.105;
const MAX_LEAN: number = 0.145;
const MAX_LIFT: number = 0.018;
const AXES: readonly Axis[] = ["x", "z", "lift", "pitch", "roll"];

const RESPONSE = {
  roll: { gravity: -1.65, speed: -0.31, accel: -0.028, jolt: -0.35 },
  pitch: { gravity: 1.75, speed: 0.31, accel: 0.028, jolt: 0.21 },
  bounce: { speed: 0.03, accel: 0.002, jolt: 0.048 },
  spring: {
    inertiaBase: 0.86,
    inertiaStep: 0.026,
    slideFreq: 10.5,
    rockFreq: 23,
    slideDamp: 0.79,
    rockDamp: 0.26,
    dampStep: 0.025,
    rockDampStep: 0.035,
    slide: 0.12,
    lean: 0.31,
  },
} as const;

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function freshSpring(): PieceSpring {
  return {
    x: 0,
    z: 0,
    lift: 0,
    pitch: 0,
    roll: 0,
    velocity: { x: 0, z: 0, lift: 0, pitch: 0, roll: 0 },
  };
}

export class BunkPiecePhysics {
  private readonly springs: PieceSpring[] = Array.from({ length: GAME_PIECES.length }, freshSpring);
  private previousRoll: number = 0;
  private previousPitch: number = 0;
  private previousHeave: number = 0;
  private previousRollSpeed: number = 0;
  private previousPitchSpeed: number = 0;
  private previousHeaveSpeed: number = 0;
  private hasPreviousFrame: boolean = false;

  reset(): void {
    for (const spring of this.springs) {
      for (const axis of AXES) {
        spring[axis] = 0;
        spring.velocity[axis] = 0;
      }
    }
    this.previousRoll = 0;
    this.previousPitch = 0;
    this.previousHeave = 0;
    this.previousRollSpeed = 0;
    this.previousPitchSpeed = 0;
    this.previousHeaveSpeed = 0;
    this.hasPreviousFrame = false;
  }

  advance(secs: number, frame: BunkMotionFrame): void {
    const dt: number = clamp(Number.isFinite(secs) ? secs : 0, 0, MAX_STEP_SECS);
    if (dt === 0) return;
    const rollSpeed: number = this.hasPreviousFrame
      ? clamp((frame.roll - this.previousRoll) / dt, -4.2, 4.2)
      : 0;
    const pitchSpeed: number = this.hasPreviousFrame
      ? clamp((frame.pitch - this.previousPitch) / dt, -4.2, 4.2)
      : 0;
    const heaveSpeed: number = this.hasPreviousFrame
      ? clamp((frame.heave - this.previousHeave) / dt, -2.1, 2.1)
      : 0;
    const rollAccel: number = this.hasPreviousFrame
      ? clamp((rollSpeed - this.previousRollSpeed) / dt, -28, 28)
      : 0;
    const pitchAccel: number = this.hasPreviousFrame
      ? clamp((pitchSpeed - this.previousPitchSpeed) / dt, -28, 28)
      : 0;
    const heaveAccel: number = this.hasPreviousFrame
      ? clamp((heaveSpeed - this.previousHeaveSpeed) / dt, -16, 16)
      : 0;
    this.previousRoll = frame.roll;
    this.previousPitch = frame.pitch;
    this.previousHeave = frame.heave;
    this.previousRollSpeed = rollSpeed;
    this.previousPitchSpeed = pitchSpeed;
    this.previousHeaveSpeed = heaveSpeed;
    this.hasPreviousFrame = true;

    const driveX: number = clamp(
      frame.roll * RESPONSE.roll.gravity +
        rollSpeed * RESPONSE.roll.speed +
        rollAccel * RESPONSE.roll.accel +
        frame.bunkJolt * RESPONSE.roll.jolt,
      -0.85,
      0.85,
    );
    const driveZ: number = clamp(
      frame.pitch * RESPONSE.pitch.gravity +
        pitchSpeed * RESPONSE.pitch.speed +
        pitchAccel * RESPONSE.pitch.accel +
        frame.bunkJolt * RESPONSE.pitch.jolt,
      -0.85,
      0.85,
    );
    const bounce: number = clamp(
      Math.abs(heaveSpeed) * RESPONSE.bounce.speed +
        Math.abs(heaveAccel) * RESPONSE.bounce.accel +
        Math.abs(frame.bunkJolt) * RESPONSE.bounce.jolt,
      0,
      MAX_LIFT,
    );

    const count: number = Math.ceil(dt / SUBSTEP_SECS);
    const step: number = dt / count;
    for (let i: number = 0; i < this.springs.length; i += 1) {
      const spring: PieceSpring | undefined = this.springs[i];
      if (!spring) continue;
      const cfg: (typeof RESPONSE)["spring"] = RESPONSE.spring;
      const inertia: number = cfg.inertiaBase + ((i * 7) % 11) * cfg.inertiaStep;
      const slideFreq: number = cfg.slideFreq / inertia;
      const rockFreq: number = cfg.rockFreq / inertia;
      const slideDamp: number = cfg.slideDamp + (i % 4) * cfg.dampStep;
      const rockDamp: number = cfg.rockDamp + (i % 4) * cfg.rockDampStep;
      const destinations: BunkPiecePose = {
        x: driveX * cfg.slide * inertia,
        z: driveZ * cfg.slide * inertia,
        lift: bounce * (0.82 + (i % 3) * 0.08),
        pitch: clamp(-driveZ * cfg.lean * inertia, -MAX_LEAN, MAX_LEAN),
        roll: clamp(driveX * cfg.lean * inertia, -MAX_LEAN, MAX_LEAN),
      };
      for (let tick: number = 0; tick < count; tick += 1) {
        for (const axis of AXES) {
          const isRocking: boolean = axis === "pitch" || axis === "roll";
          const natFreq: number = isRocking ? rockFreq : slideFreq;
          const dampRatio: number = isRocking ? rockDamp : slideDamp;
          const acceleration: number =
            natFreq * natFreq * (destinations[axis] - spring[axis]) -
            2 * dampRatio * natFreq * spring.velocity[axis];
          spring.velocity[axis] += acceleration * step;
          spring[axis] += spring.velocity[axis] * step;
          const boundary: number =
            axis === "lift" ? MAX_LIFT : axis === "pitch" || axis === "roll" ? MAX_LEAN : MAX_SLIDE;
          const clipped: number = clamp(spring[axis], axis === "lift" ? 0 : -boundary, boundary);
          if (clipped !== spring[axis]) spring.velocity[axis] = 0;
          spring[axis] = clipped;
        }
      }
    }
  }

  pose(pcId: PcId): BunkPiecePose {
    const spring: PieceSpring | undefined = this.springs[pcId];
    if (!spring) throw new RangeError(`Invalid bunk piece id: ${pcId}`);
    return {
      x: spring.x,
      z: spring.z,
      lift: spring.lift,
      pitch: spring.pitch,
      roll: spring.roll,
    };
  }
}
