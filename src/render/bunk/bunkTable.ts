import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  TorusGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export function createBunkLapTray(): Group {
  const group: Group = new Group();
  group.visible = false;
  const canvas = new MeshPhysicalMaterial({ color: 0x264960, roughness: 0.87 });
  const edge = new MeshPhysicalMaterial({ color: 0xd7a66f, roughness: 0.65 });
  const rubber = new MeshPhysicalMaterial({ color: 0x172e42, roughness: 0.98 });
  const cloth = new MeshPhysicalMaterial({ color: 0x73899a, roughness: 1 });
  const rivet = new MeshPhysicalMaterial({ color: 0xc7cfca, metalness: 0.65, roughness: 0.45 });
  const tray = new Mesh(new RoundedBoxGeometry(13.85, 0.21, 12.7, 5, 0.42), canvas);
  tray.position.set(0, -0.23, 0);
  tray.receiveShadow = true;
  tray.castShadow = true;
  group.add(tray);

  for (const z of [-6.22, 6.22]) {
    const lip = new Mesh(new RoundedBoxGeometry(13.14, 0.09, 0.13, 3, 0.045), edge);
    lip.position.set(0, -0.075, z);
    lip.castShadow = true;
    group.add(lip);
  }
  for (const x of [-6.77, 6.77]) {
    const lip = new Mesh(new RoundedBoxGeometry(0.13, 0.09, 11.9, 3, 0.045), edge);
    lip.position.set(x, -0.075, 0);
    lip.castShadow = true;
    group.add(lip);
  }
  for (const x of [-3.25, 3.25]) {
    const cushion = new Mesh(new RoundedBoxGeometry(3.6, 0.42, 9.9, 5, 0.45), cloth);
    cushion.position.set(x, -0.51, 0);
    cushion.receiveShadow = true;
    group.add(cushion);
  }
  for (const x of [-6.36, 6.36]) {
    const grip = new Mesh(new RoundedBoxGeometry(0.3, 0.045, 1.65, 3, 0.08), rubber);
    grip.position.set(x, -0.085, 0);
    group.add(grip);
  }
  for (const x of [-6.45, 6.45]) {
    for (const z of [-5.92, 5.92]) {
      const screw = new Mesh(new CylinderGeometry(0.07, 0.07, 0.02, 16), rivet);
      screw.position.set(x, -0.06, z);
      group.add(screw);
    }
  }
  for (const x of [-5.85, 5.85]) {
    for (const z of [-5.2, 5.2]) {
      const ring = new Mesh(new TorusGeometry(0.29, 0.025, 6, 36), edge);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(x, -0.107, z);
      group.add(ring);
      const north = new Mesh(new BoxGeometry(0.052, 0.02, 0.38), rivet);
      north.position.set(x, -0.098, z);
      north.rotation.y = Math.PI / 4;
      group.add(north);
    }
  }
  group.traverse((obj): void => {
    if (obj instanceof Mesh) obj.raycast = (): void => {};
  });
  return group;
}
