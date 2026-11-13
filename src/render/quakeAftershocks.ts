export interface AftershockPeriod {
  readonly days: number;
  readonly m4: number;
  readonly m5Plus: number;
}

export const AFTERSHOCK_PERIODS: readonly AftershockPeriod[] = [
  { days: 1, m4: 114, m5Plus: 18 },
  { days: 1, m4: 19, m5Plus: 1 },
  { days: 7, m4: 37, m5Plus: 4 },
  { days: 7, m4: 20, m5Plus: 0 },
  { days: 7, m4: 9, m5Plus: 0 },
  { days: 7, m4: 3, m5Plus: 0 },
  { days: 28, m4: 15, m5Plus: 3 },
  { days: 28, m4: 11, m5Plus: 0 },
  { days: 28, m4: 3, m5Plus: 0 },
  { days: 28, m4: 7, m5Plus: 1 },
  { days: 28, m4: 5, m5Plus: 0 },
] as const;

export const GAMEPLAY_SECS_PER_DAY: number = 8 * 60;
export const VISIBLE_EVENT_FRACTION: number = 0.12;
export const INFERRED_M3_PER_M4: number = 9;

export interface QuakeRotation {
  readonly pitch: number;
  readonly roll: number;
  readonly yaw: number;
}

interface ActiveTremor {
  readonly start: number;
  readonly dur: number;
  readonly amp: number;
  readonly pieceAmp: number;
  readonly freq: number;
  readonly phase: number;
}

const MAX_STEP_SECS: number = 0.1;
const MIN_HAZARD: number = 1e-12;

function constrain(val: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, val));
}

function sampleMagnitude(lower: number, random: () => number): number {
  return lower - Math.log10(1 - 0.9 * constrain(random(), 0, 1 - Number.EPSILON));
}

export class CanterburyAftershocks {
  private time: number = 0;
  private virtualTime: number = 0;
  private remainingHazard: number;
  private readonly active: ActiveTremor[] = [];

  constructor(
    private readonly random: () => number = Math.random,
    private readonly onTremor?: (magnitude: number) => void,
  ) {
    this.remainingHazard = this.nxtHazard();
  }

  reset(): void {
    this.time = 0;
    this.virtualTime = 0;
    this.active.length = 0;
    this.remainingHazard = this.nxtHazard();
  }

  step(secs: number): QuakeRotation {
    const dt: number = constrain(Number.isFinite(secs) ? secs : 0, 0, MAX_STEP_SECS);
    if (dt > 0) {
      this.time += dt;
      this.advanceCatalog(dt);
    }
    for (let i: number = this.active.length - 1; i >= 0; i -= 1) {
      const event: ActiveTremor | undefined = this.active[i];
      if (event && this.time >= event.start + event.dur) this.active.splice(i, 1);
    }

    let pitch: number = 0;
    let roll: number = 0;
    let yaw: number = 0;
    for (const event of this.active) {
      const local: number = this.time - event.start;
      const envelope: number = this.envelope(event, local);
      const wave: number = 2 * Math.PI * event.freq * local + event.phase;
      pitch += event.amp * envelope * Math.sin(wave);
      roll += event.amp * envelope * Math.sin(wave * 0.79 + 1.32);
      yaw += event.amp * 0.32 * envelope * Math.sin(wave * 0.41 - 0.68);
    }
    return {
      pitch: constrain(pitch, -0.052, 0.052),
      roll: constrain(roll, -0.052, 0.052),
      yaw: constrain(yaw, -0.019, 0.019),
    };
  }

  pieceWobble(pieceId: number): QuakeRotation {
    let pitch: number = 0;
    let roll: number = 0;
    for (const event of this.active) {
      if (event.pieceAmp <= 0) continue;
      const local: number = this.time - event.start;
      const envelope: number = this.envelope(event, local);
      const phase: number = pieceId * 1.618 + event.phase;
      const wave: number = 2 * Math.PI * event.freq * local;
      pitch += event.pieceAmp * envelope * Math.sin(wave * 0.91 + phase);
      roll += event.pieceAmp * envelope * Math.sin(wave * 1.06 + phase * 0.73);
    }
    return {
      pitch: constrain(pitch, -0.075, 0.075),
      roll: constrain(roll, -0.075, 0.075),
      yaw: 0,
    };
  }

  private nxtHazard(): number {
    return -Math.log(Math.max(MIN_HAZARD, 1 - constrain(this.random(), 0, 1 - 1e-12)));
  }

  private locatePeriod(secs: number): {
    period: AftershockPeriod;
    end: number;
  } {
    let end: number = 0;
    for (const period of AFTERSHOCK_PERIODS) {
      end += period.days * GAMEPLAY_SECS_PER_DAY;
      if (secs < end) return { period, end };
    }
    const firstPeriod: AftershockPeriod | undefined = AFTERSHOCK_PERIODS[0];
    if (firstPeriod === undefined) {
      throw new Error("No aftershock periods configured");
    }
    return { period: firstPeriod, end: GAMEPLAY_SECS_PER_DAY };
  }

  private advanceCatalog(delta: number): void {
    let timeLeft: number = delta;
    const ttlSecs: number = AFTERSHOCK_PERIODS.reduce(
      (sum: number, period: AftershockPeriod): number => sum + period.days * GAMEPLAY_SECS_PER_DAY,
      0,
    );
    let iterations: number = 0;
    while (timeLeft > 1e-10 && iterations < 32) {
      iterations += 1;
      if (this.virtualTime >= ttlSecs - 1e-8) this.virtualTime = 0;
      const { period, end } = this.locatePeriod(this.virtualTime);
      const maxSlice: number = Math.min(timeLeft, end - this.virtualTime);
      const count: number = period.m4 * (INFERRED_M3_PER_M4 + 1) + period.m5Plus;
      const rate: number = (VISIBLE_EVENT_FRACTION * count) / (period.days * GAMEPLAY_SECS_PER_DAY);
      const toNext: number = rate > 0 ? this.remainingHazard / rate : Infinity;
      if (toNext <= maxSlice) {
        this.virtualTime += toNext;
        timeLeft -= toNext;
        this.startTremor(period);
        this.remainingHazard = this.nxtHazard();
      } else {
        this.remainingHazard -= maxSlice * rate;
        this.virtualTime += maxSlice;
        timeLeft -= maxSlice;
      }
    }
  }

  private startTremor(period: AftershockPeriod): void {
    const m3: number = period.m4 * INFERRED_M3_PER_M4;
    const draw: number = this.random() * (m3 + period.m4 + period.m5Plus);
    const lower: 3 | 4 | 5 = draw < m3 ? 3 : draw < m3 + period.m4 ? 4 : 5;
    const magnitude: number = sampleMagnitude(lower, this.random);
    this.onTremor?.(magnitude);
    const siteFactor: number = 0.76 + 0.46 * this.random();
    const felt: number = constrain(((magnitude - 2.85) / 2.7) * siteFactor, 0.07, 1);
    const amp: number = 0.002 + 0.038 * felt ** 1.35;
    const pieceAmp: number = 0.15 * Math.max(0, felt - 0.39) ** 1.25;
    const dur: number = 1.45 + 5.3 * felt + this.random() * 1.2;
    this.active.push({
      start: this.time,
      amp,
      pieceAmp,
      dur,
      freq: 2.5 + 3.3 * this.random(),
      phase: Math.PI * 2 * this.random(),
    });
  }

  private envelope(event: ActiveTremor, elapsed: number): number {
    if (elapsed <= 0 || elapsed >= event.dur) return 0;
    return Math.sin((Math.PI * elapsed) / event.dur) ** 1.3;
  }
}
