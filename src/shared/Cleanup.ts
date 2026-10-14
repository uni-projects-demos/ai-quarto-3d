export type Dispose = () => void;

export class Cleanup {
  private readonly callbacks: Dispose[] = [];
  private readonly events = new AbortController();
  private disposed = false;

  get signal(): AbortSignal {
    return this.events.signal;
  }

  add(callback: Dispose): void {
    if (this.disposed) callback();
    else this.callbacks.push(callback);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.events.abort();
    const errors: unknown[] = [];
    for (const callback of this.callbacks.splice(0).reverse()) {
      try {
        callback();
      } catch (err) {
        errors.push(err);
      }
    }
    if (errors.length > 0) throw new AggregateError(errors, "Could not release all resources");
  }
}
