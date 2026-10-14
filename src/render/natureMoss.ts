import {
  Color,
  ConeGeometry,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
  Vector3,
} from "three";

const RING_RADIUS = 3.45;
const MOSS_RADIUS = 0.12;

export function createMossRim(): {
  geometry: TorusGeometry;
  fibres: InstancedMesh<ConeGeometry, MeshStandardMaterial>;
} {
  const geometry = new TorusGeometry(RING_RADIUS, MOSS_RADIUS, 32, 240);
  const positions = geometry.getAttribute("position");
  for (let vertex = 0; vertex < positions.count; vertex += 1) {
    const x = positions.getX(vertex);
    const y = positions.getY(vertex);
    const angle = Math.atan2(y, x);
    const crossSection = Math.atan2(positions.getZ(vertex), Math.hypot(x, y) - RING_RADIUS);
    const radius = mossRadius(angle, crossSection);
    positions.setXYZ(
      vertex,
      (RING_RADIUS + radius * Math.cos(crossSection)) * Math.cos(angle),
      (RING_RADIUS + radius * Math.cos(crossSection)) * Math.sin(angle),
      radius * Math.sin(crossSection),
    );
  }
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  const fibres = new InstancedMesh(
    new ConeGeometry(1, 1, 3),
    new MeshStandardMaterial({ color: 0xffffff, roughness: 0.96, metalness: 0 }),
    4800,
  );
  fibres.name = "nature-moss-fibres";
  fibres.visible = false;
  fibres.receiveShadow = true;
  fibres.raycast = (): void => {};
  const strand = new Object3D();
  const up = new Vector3(0, 1, 0);
  const normal = new Vector3();
  const colour = new Color();
  let seed = 0x6174e;
  const random = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let idx = 0; idx < fibres.count; idx += 1) {
    const angle = random() * Math.PI * 2;
    const crossSection = -random() * Math.PI;
    const radius = mossRadius(angle, crossSection);
    const length = 0.018 + random() ** 2 * 0.045;
    const width = 0.002 + random() * 0.003;
    normal.set(
      Math.cos(angle) * Math.cos(crossSection),
      Math.sin(angle) * Math.cos(crossSection),
      Math.sin(crossSection),
    );
    strand.position.set(
      (RING_RADIUS + radius * Math.cos(crossSection)) * Math.cos(angle),
      (RING_RADIUS + radius * Math.cos(crossSection)) * Math.sin(angle),
      radius * Math.sin(crossSection),
    );
    normal.x += (random() - 0.5) * 0.45;
    normal.y += (random() - 0.5) * 0.45;
    normal.normalize();
    strand.position.addScaledVector(normal, length / 2 - 0.003);
    strand.quaternion.setFromUnitVectors(up, normal);
    strand.scale.set(width, length, width * 0.65);
    strand.updateMatrix();
    fibres.setMatrixAt(idx, strand.matrix);
    colour.setHSL(0.205 + random() * 0.075, 0.28 + random() * 0.24, 0.16 + random() * 0.14);
    fibres.setColorAt(idx, colour);
  }
  fibres.computeBoundingSphere();
  return { geometry, fibres };
}

function mossRadius(angle: number, crossSection: number): number {
  return (
    MOSS_RADIUS +
    0.012 * Math.sin(angle * 27 + Math.sin(crossSection * 3)) +
    0.007 * Math.sin(angle * 61 + crossSection * 4) +
    0.006 * Math.sin(angle * 13 - crossSection * 2)
  );
}
