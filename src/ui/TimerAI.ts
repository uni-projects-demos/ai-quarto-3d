export interface ClockAI {
  now(): number;
  set(cb: () => void, ms: number): number;
  clear(id: number): void;
}

const clockAI: ClockAI = {
  now: (): number => performance.now(),
  set: (cb, ms): number => window.setTimeout(cb, ms),
  clear: (id): void => window.clearTimeout(id),
};

export class TimerAI {
  private id: number | null = null;
  private remMS: number;
  private startedAt = 0;
  private disposed = false;

  constructor(
    delayMS: number,
    private readonly cb: () => void,
    private readonly clock: ClockAI = clockAI,
  ) {
    this.remMS = Math.max(0, delayMS);
  }

  timerResumeAI(): void {
    if (this.disposed || this.id !== null) return;
    this.startedAt = this.clock.now();
    const id = this.clock.set((): void => {
      if (this.disposed || this.id !== id) return;
      this.id = null;
      this.disposed = true;
      this.cb();
    }, this.remMS);
    this.id = id;
  }

  timerPauseAI(): void {
    if (this.id === null) return;
    this.clock.clear(this.id);
    this.id = null;
    this.remMS = Math.max(0, this.remMS - (this.clock.now() - this.startedAt));
  }

  timerClearAI(): void {
    if (this.id !== null) this.clock.clear(this.id);
    this.id = null;
    this.disposed = true;
  }
}
