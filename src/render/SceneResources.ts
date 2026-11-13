import {
  InstancedMesh,
  Material,
  Mesh,
  type Object3D,
  type Object3DEventMap,
  Texture,
} from "three";

interface Disposable {
  dispose(): void;
}

export class SceneResources {
  private readonly resMap: Set<Disposable> = new Set<Disposable>();
  private readonly released: WeakSet<Disposable> = new WeakSet<Disposable>();
  private isDisposed: boolean = false;

  track<T extends Disposable>(res: T): T {
    if (this.resMap.has(res) || this.released.has(res)) return res;
    if (this.isDisposed) {
      this.released.add(res);
    } else this.resMap.add(res);
    if (res instanceof Material) {
      for (const val of Object.values(res)) {
        if (val instanceof Texture) this.track(val);
      }
    }
    if (this.isDisposed) res.dispose();
    return res;
  }

  trackObject(root: Object3D): void {
    root.traverse((obj: Object3D<Object3DEventMap>): void => {
      if (!(obj instanceof Mesh)) return;
      this.track(obj.geometry);
      for (const mat of Array.isArray(obj.material) ? obj.material : [obj.material]) {
        this.track(mat);
      }
      if (obj instanceof InstancedMesh) this.track(obj);
    });
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
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
