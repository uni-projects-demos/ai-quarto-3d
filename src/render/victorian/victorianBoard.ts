import { type Group, Mesh, type MeshStandardMaterial, TorusGeometry } from "three";

export function createVictorianBoardDetails(group: Group, brass: MeshStandardMaterial): void {
  group.visible = false;
  for (const rad of [3.12, 3.24]) {
    const ring = new Mesh(new TorusGeometry(rad, 0.012, 8, 96), brass);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }
  for (let corner: number = 0; corner < 4; corner += 1) {
    const ang: number = (corner * Math.PI) / 2;
    const ornament = new Mesh(new TorusGeometry(0.07, 0.012, 8, 24), brass);
    ornament.rotation.x = Math.PI / 2;
    ornament.position.set(Math.cos(ang) * 3.18, 0, Math.sin(ang) * 3.18);
    group.add(ornament);
  }
}
