export interface BunkMotionFrame {
  readonly pitch: number;
  readonly roll: number;
  readonly yaw: number;
  readonly heave: number;
  readonly bunkJolt: number;
  readonly sea: Readonly<{ pitch: number; roll: number; yaw: number; heave: number }>;
  readonly lowerBunk: Readonly<{ pitch: number; roll: number; heave: number }>;
  readonly surface: Readonly<{ surge: number; cross: number; foam: number; intensity: number }>;
}

interface SeaPattern {
  readonly amplitude: number;
  readonly period: number;
  readonly chop: number;
  readonly direction: number;
  readonly phase: number;
}

interface LowerBunkEvent {
  readonly started: number;
  readonly duration: number;
  readonly strength: number;
  readonly frequency: number;
  readonly phase: number;
  readonly kind: "roll" | "deliberate";
}

const MAX_STEP_SECS: number = 0.1;
const TAU: number = Math.PI * 2;

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

function smoothstep(value: number): number {
  const t: number = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

export class BunkMotion {
  private time: number = 0;
  private patternStart: number = 0;
  private transitionTime: number = 0;
  private from: SeaPattern;
  private to: SeaPattern;
  private nextPatternAt: number = 0;
  private nextRollAt: number = 0;
  private nextDeliberateAt: number = 0;
  private readonly events: LowerBunkEvent[] = [];
  private lastJolt: number = 0;

  constructor(private readonly random: () => number = Math.random) {
    this.from = this.pickPattern();
    this.to = this.from;
    this.reset();
  }

  reset(): void {
    this.time = 0;
    this.patternStart = 0;
    this.transitionTime = 0;
    this.from = this.pickPattern();
    this.to = this.from;
    this.nextPatternAt = 13 + this.unit() * 18;
    this.nextRollAt = 5 + this.unit() * 10;
    this.nextDeliberateAt = 18 + this.unit() * 33;
    this.events.length = 0;
    this.lastJolt = 0;
  }

  step(secs: number): BunkMotionFrame {
    const dt: number = clamp(Number.isFinite(secs) ? secs : 0, 0, MAX_STEP_SECS);
    this.time += dt;
    if (this.time >= this.nextPatternAt) {
      this.from = this.blendPattern();
      this.to = this.pickPattern();
      this.patternStart = this.time;
      this.transitionTime = 5 + this.unit() * 8;
      this.nextPatternAt = this.time + this.transitionTime + 10 + this.unit() * 22;
    }
    if (this.time >= this.nextRollAt) {
      this.addEvent("roll");
      this.nextRollAt = this.time + 7 + this.unit() * 13;
    }
    if (this.time >= this.nextDeliberateAt) {
      this.addEvent("deliberate");
      this.nextDeliberateAt = this.time + 25 + this.unit() * 45;
    }

    const pattern: SeaPattern = this.blendPattern();
    const theta: number = (TAU * this.time) / pattern.period + pattern.phase;
    const slowSwell: number = Math.sin(theta) + 0.32 * Math.sin(theta * 0.57 + 0.9);
    const crossSwell: number = Math.sin(theta * 1.39 + 1.7);
    const chop: number = pattern.chop * Math.sin(theta * 3.8 + Math.sin(theta * 0.73));
    const pitch: number = pattern.amplitude * (0.67 * slowSwell + 0.23 * chop);
    const roll: number = pattern.amplitude * (0.9 * crossSwell + 0.22 * chop) * pattern.direction;
    const yaw: number = pattern.amplitude * 0.16 * Math.sin(theta * 0.67 + 0.43);
    const heave: number = pattern.amplitude * 0.64 * Math.sin(theta * 1.1 - 0.8);

    let bunkPitch: number = 0;
    let bunkRoll: number = 0;
    let bunkHeave: number = 0;
    let jolt: number = 0;
    for (let i: number = this.events.length - 1; i >= 0; i -= 1) {
      const event: LowerBunkEvent | undefined = this.events[i];
      if (!event) continue;
      const age: number = this.time - event.started;
      if (age >= event.duration) {
        this.events.splice(i, 1);
        continue;
      }
      const progress: number = age / event.duration;
      const envelope: number =
        smoothstep(age / (event.kind === "roll" ? 0.45 : 0.065)) *
        (1 - smoothstep((progress - (event.kind === "roll" ? 0.55 : 0.7)) / 0.45));
      const wave: number = TAU * age * event.frequency + event.phase;
      const impulse: number =
        event.kind === "deliberate"
          ? Math.sin(wave) + 0.38 * Math.sin(wave * 1.91 + 0.8)
          : Math.sin(wave);
      const magnitude: number = event.strength * envelope * impulse;
      bunkRoll += magnitude;
      bunkPitch += magnitude * (event.kind === "roll" ? 0.32 : 0.62);
      bunkHeave += magnitude * (event.kind === "roll" ? 0.09 : 0.25);
      if (event.kind === "deliberate") jolt += magnitude;
    }
    this.lastJolt = clamp(jolt, -0.15, 0.15);
    return {
      pitch: clamp(pitch + bunkPitch, -0.14, 0.14),
      roll: clamp(roll + bunkRoll, -0.17, 0.17),
      yaw: clamp(yaw + this.lastJolt * 0.18, -0.035, 0.035),
      heave: clamp(heave + bunkHeave, -0.105, 0.105),
      bunkJolt: this.lastJolt,
      sea: { pitch, roll, yaw, heave },
      lowerBunk: { pitch: bunkPitch, roll: bunkRoll, heave: bunkHeave },
      surface: {
        surge: Math.sin(theta * 1.1 - 0.8),
        cross: Math.sin(theta * 1.39 + 1.7),
        foam: Math.sin(theta * 3.8 + Math.sin(theta * 0.73)),
        intensity: clamp(pattern.amplitude / 0.074, 0, 1),
      },
    };
  }

  private unit(): number {
    const value: number = this.random();
    return Number.isFinite(value) ? clamp(value, 0, 1 - Number.EPSILON) : 0.5;
  }

  private pickPattern(): SeaPattern {
    const intensity: number = this.unit();
    return {
      amplitude: 0.012 + intensity ** 1.5 * 0.062,
      period: 3.2 + this.unit() * 7.6,
      chop: 0.15 + this.unit() * 0.8,
      direction: this.unit() < 0.5 ? -1 : 1,
      phase: this.unit() * TAU,
    };
  }

  private blendPattern(): SeaPattern {
    const amount: number =
      this.transitionTime > 0
        ? smoothstep((this.time - this.patternStart) / this.transitionTime)
        : 1;
    const mix: (a: number, b: number) => number = (a: number, b: number): number =>
      a + (b - a) * amount;
    return {
      amplitude: mix(this.from.amplitude, this.to.amplitude),
      period: mix(this.from.period, this.to.period),
      chop: mix(this.from.chop, this.to.chop),
      direction: mix(this.from.direction, this.to.direction),
      phase: mix(this.from.phase, this.to.phase),
    };
  }

  private addEvent(kind: LowerBunkEvent["kind"]): void {
    this.events.push({
      kind,
      started: this.time,
      duration: kind === "roll" ? 1.1 + this.unit() * 2.3 : 1.1 + this.unit() * 2.0,
      strength: kind === "roll" ? 0.012 + this.unit() * 0.022 : 0.063 + this.unit() * 0.069,
      frequency: kind === "roll" ? 0.42 + this.unit() * 0.42 : 2.0 + this.unit() * 2.6,
      phase: this.unit() * TAU,
    });
  }
}
