export type Dispose = () => void;

export class Cleanup {
  private readonly cbs: Dispose[] = [];
  private readonly events: AbortController = new AbortController();
  private isDispose: boolean = false;

  get signal(): AbortSignal {
    return this.events.signal;
  }

  add(cb: Dispose): void {
    if (this.isDispose) cb();
    else this.cbs.push(cb);
  }

  dispose(): void {
    if (this.isDispose) return;
    this.isDispose = true;
    this.events.abort();
    const errs: unknown[] = [];
    for (const cb of this.cbs.splice(0).reverse()) {
      try {
        cb();
      } catch (err) {
        errs.push(err);
      }
    }
    if (errs.length > 0) throw new AggregateError(errs, "Could not release all resources");
  }
}
