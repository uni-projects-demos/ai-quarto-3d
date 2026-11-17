import {
  BoxGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  SphereGeometry,
  TorusGeometry,
} from "three";
import type { PieceTraits } from "../../game/pieces";
import type { PcId } from "../../game/types";

const brass = new MeshPhysicalMaterial({ color: 0xc99e56, metalness: 0.7, roughness: 0.3 });
const oak = new MeshPhysicalMaterial({ color: 0x825537, roughness: 0.6, clearcoat: 0.24 });
const rope = new MeshPhysicalMaterial({ color: 0xe7d5aa, roughness: 0.89 });
const glass = new MeshPhysicalMaterial({
  color: 0x86bac6,
  emissive: 0x173e5d,
  emissiveIntensity: 0.15,
  roughness: 0.2,
  metalness: 0.06,
});

export function createBunkPieceDetails(traits: PieceTraits, _pcId: PcId): Group {
  const group: Group = new Group();
  group.visible = false;
  const hgt: number = traits.isBig ? 1.45 : 0.9;
  const face: number = traits.isRound ? 0.377 : 0.411;

  const lowerTrim = new Mesh(
    traits.isRound ? new TorusGeometry(0.358, 0.026, 8, 40) : new BoxGeometry(0.795, 0.05, 0.795),
    oak,
  );
  lowerTrim.position.y = 0.105;
  if (traits.isRound) lowerTrim.rotation.x = Math.PI / 2;
  group.add(lowerTrim);
  const upperTrim = new Mesh(
    traits.isRound ? new TorusGeometry(0.358, 0.016, 8, 40) : new BoxGeometry(0.78, 0.022, 0.78),
    brass,
  );
  upperTrim.position.y = hgt * 0.74;
  if (traits.isRound) upperTrim.rotation.x = Math.PI / 2;
  group.add(upperTrim);

  for (const dx of [-0.19, 0.19]) {
    const rim = new Mesh(new TorusGeometry(0.074, 0.019, 7, 24), brass);
    rim.position.set(dx, hgt * 0.48, face);
    const pane = new Mesh(new SphereGeometry(0.059, 12, 8), glass);
    pane.scale.z = 0.12;
    pane.position.copy(rim.position);
    group.add(rim, pane);
  }

  const ropeStripe = new Mesh(
    traits.isRound ? new TorusGeometry(0.356, 0.014, 7, 40) : new BoxGeometry(0.73, 0.028, 0.032),
    rope,
  );
  ropeStripe.position.set(0, hgt * 0.26, traits.isRound ? 0 : face + 0.002);
  if (traits.isRound) ropeStripe.rotation.x = Math.PI / 2;
  group.add(ropeStripe);

  if (traits.isSolid) {
    const cap = new Mesh(
      traits.isRound ? new TorusGeometry(0.205, 0.02, 8, 24) : new BoxGeometry(0.31, 0.03, 0.31),
      brass,
    );
    cap.position.y = hgt + 0.025;
    if (traits.isRound) cap.rotation.x = Math.PI / 2;
    group.add(cap);
  } else {
    for (const x of [-0.27, 0.27]) {
      const rivet = new Mesh(new SphereGeometry(0.026, 8, 6), brass);
      rivet.position.set(x, hgt - 0.025, -0.2);
      group.add(rivet);
    }
  }

  group.traverse((obj): void => {
    if (obj instanceof Mesh) obj.raycast = (): void => {};
  });
  return group;
}
