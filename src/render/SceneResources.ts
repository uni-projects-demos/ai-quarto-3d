import { InstancedMesh, Material, Mesh, type Object3D, Texture } from "three";

interface Disposable {
  dispose(): void;
}

export class SceneResources {
  private readonly resources = new Set<Disposable>();
  private readonly released = new WeakSet<Disposable>();
  private isDisposed = false;

  track<T extends Disposable>(resource: T): T {
    if (this.resources.has(resource) || this.released.has(resource)) return resource;
    if (this.isDisposed) {
      this.released.add(resource);
    } else this.resources.add(resource);
    if (resource instanceof Material) {
      for (const val of Object.values(resource)) {
        if (val instanceof Texture) this.track(val);
      }
    }
    if (this.isDisposed) resource.dispose();
    return resource;
  }

  trackObject(root: Object3D): void {
    root.traverse((object): void => {
      if (!(object instanceof Mesh)) return;
      this.track(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        this.track(material);
      }
      if (object instanceof InstancedMesh) this.track(object);
    });
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    const errors: unknown[] = [];
    for (const resource of this.resources) {
      this.released.add(resource);
      try {
        resource.dispose();
      } catch (err) {
        errors.push(err);
      }
    }
    this.resources.clear();
    if (errors.length > 0) throw new AggregateError(errors, "Could not release scene resources");
  }
}
