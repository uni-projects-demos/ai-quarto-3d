import { InstancedMesh, Material, Mesh, type Object3D, Texture } from "three";

interface Disposable {
  dispose(): void;
}

export class SceneResources {
  private readonly resMap = new Set<Disposable>();
  private readonly released = new WeakSet<Disposable>();
  private disposed = false;

  track<T extends Disposable>(res: T): T {
    if (this.resMap.has(res) || this.released.has(res)) return res;
    if (this.disposed) {
      this.released.add(res);
    } else this.resMap.add(res);
    if (res instanceof Material) {
      for (const val of Object.values(res)) {
        if (val instanceof Texture) this.track(val);
      }
    }
    if (this.disposed) res.dispose();
    return res;
  }

  trackObject(root: Object3D): void {
    root.traverse((obj): void => {
      if (!(obj instanceof Mesh)) return;
      this.track(obj.geometry);
      for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
        this.track(mat);
      }
      if (obj instanceof InstancedMesh) this.track(obj);
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const errs: unknown[] = [];
    for (const res of this.resMap) {
      this.released.add(res);
      try {
        res.dispose();
      } catch (err) {
        errs.push(err);
      }
    }
    this.resMap.clear();
    if (errs.length > 0) throw new AggregateError(errs, "Could not release scene resources");
  }
}
