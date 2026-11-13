import {
  BoxGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  TetrahedronGeometry,
  TorusGeometry,
} from "three";

export function createQuakeTableDetails(): Group {
  const group = new Group();
  group.visible = false;
  const seam = new MeshPhysicalMaterial({ color: 0xafa99a, roughness: 1 });
  for (const radius of [5.85, 5.92, 8.15]) {
    const ring = new Mesh(new TorusGeometry(radius, 0.008, 5, 160), seam);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.014;
    ring.raycast = (): void => {};
    group.add(ring);
  }
  const dust = new MeshPhysicalMaterial({ color: 0x827b70, roughness: 1 });
  const brick = new MeshPhysicalMaterial({ color: 0x895952, roughness: 1 });
  const splinter = new MeshPhysicalMaterial({ color: 0x8c7963, roughness: 1 });
  for (let i: number = 0; i < 42; i += 1) {
    const angle: number = i * 2.39996 + Math.sin(i * 7.3) * 0.27;
    const radius: number = 5.35 + ((i * 17) % 22) / 10;
    const shard = new Mesh(
      i % 5 === 0
        ? new BoxGeometry(0.15, 0.035, 0.042)
        : new TetrahedronGeometry(0.025 + (i % 4) * 0.012),
      i % 5 === 0 ? splinter : i % 3 === 0 ? brick : dust,
    );
    shard.position.set(Math.cos(angle) * radius, 0.03, Math.sin(angle) * radius);
    shard.rotation.set(0.1 * Math.sin(i * 8.1), angle + 0.23, 0.05 * Math.cos(i));
    shard.castShadow = true;
    shard.receiveShadow = true;
    shard.raycast = (): void => {};
    group.add(shard);
  }
  return group;
}
