export interface ClockAI {
  now(): number;
  set(cb: () => void, ms: number): number;
  clear(id: number): void;
}

const clockAI: ClockAI = {
  now: (): number => performance.now(),
  set: (cb: () => void, ms: number): number => window.setTimeout(cb, ms),
  clear: (id: number): void => window.clearTimeout(id),
};

export class TimerAI {
  private id: number | null = null;
  private remMS: number;
  private startedAt: number = 0;
  private isDisposed: boolean = false;

  constructor(
    delayMS: number,
    private readonly cb: () => void,
    private readonly clock: ClockAI = clockAI,
  ) {
    this.remMS = Math.max(0, delayMS);
  }

  timerResumeAI(): void {
    if (this.isDisposed || this.id !== null) return;
    this.startedAt = this.clock.now();
    const id: number = this.clock.set((): void => {
      if (this.isDisposed || this.id !== id) return;
      this.id = null;
      this.isDisposed = true;
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
    this.isDisposed = true;
  }
}
