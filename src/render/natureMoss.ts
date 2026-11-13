import {
  type BufferAttribute,
  Color,
  ConeGeometry,
  InstancedMesh,
  type InterleavedBufferAttribute,
  MeshStandardMaterial,
  Object3D,
  TorusGeometry,
  Vector3,
} from "three";

const RING_RADIUS: number = 3.45;
const MOSS_RADIUS: number = 0.12;

export function createMossRim(): {
  geometry: TorusGeometry;
  fibres: InstancedMesh<ConeGeometry, MeshStandardMaterial>;
} {
  const geom = new TorusGeometry(RING_RADIUS, MOSS_RADIUS, 32, 240);
  const posArr: BufferAttribute | InterleavedBufferAttribute = geom.getAttribute("position");
  for (let vtx: number = 0; vtx < posArr.count; vtx += 1) {
    const x: number = posArr.getX(vtx);
    const y: number = posArr.getY(vtx);
    const ang: number = Math.atan2(y, x);
    const crossSection: number = Math.atan2(posArr.getZ(vtx), Math.hypot(x, y) - RING_RADIUS);
    const rad: number = mossRadius(ang, crossSection);
    posArr.setXYZ(
      vtx,
      (RING_RADIUS + rad * Math.cos(crossSection)) * Math.cos(ang),
      (RING_RADIUS + rad * Math.cos(crossSection)) * Math.sin(ang),
      rad * Math.sin(crossSection),
    );
  }
  geom.computeVertexNormals();
  geom.computeBoundingSphere();

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
  const col = new Color();
  let seed: number = 0x6174e;
  const rnd: () => number = (): number => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let idx: number = 0; idx < fibres.count; idx += 1) {
    const ang: number = rnd() * Math.PI * 2;
    const crossSection: number = -rnd() * Math.PI;
    const rad: number = mossRadius(ang, crossSection);
    const len: number = 0.018 + rnd() ** 2 * 0.045;
    const wdt: number = 0.002 + rnd() * 0.003;
    normal.set(
      Math.cos(ang) * Math.cos(crossSection),
      Math.sin(ang) * Math.cos(crossSection),
      Math.sin(crossSection),
    );
    strand.position.set(
      (RING_RADIUS + rad * Math.cos(crossSection)) * Math.cos(ang),
      (RING_RADIUS + rad * Math.cos(crossSection)) * Math.sin(ang),
      rad * Math.sin(crossSection),
    );
    normal.x += (rnd() - 0.5) * 0.45;
    normal.y += (rnd() - 0.5) * 0.45;
    normal.normalize();
    strand.position.addScaledVector(normal, len / 2 - 0.003);
    strand.quaternion.setFromUnitVectors(up, normal);
    strand.scale.set(wdt, len, wdt * 0.65);
    strand.updateMatrix();
    fibres.setMatrixAt(idx, strand.matrix);
    col.setHSL(0.205 + rnd() * 0.075, 0.28 + rnd() * 0.24, 0.16 + rnd() * 0.14);
    fibres.setColorAt(idx, col);
  }
  fibres.computeBoundingSphere();
  return { geometry: geom, fibres };
}

function mossRadius(ang: number, crossSection: number): number {
  return (
    MOSS_RADIUS +
    0.012 * Math.sin(ang * 27 + Math.sin(crossSection * 3)) +
    0.007 * Math.sin(ang * 61 + crossSection * 4) +
    0.006 * Math.sin(ang * 13 - crossSection * 2)
  );
}
