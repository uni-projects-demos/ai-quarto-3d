import type { Group, Vector3 } from "three";
import { GAME_PIECES } from "../../game/pieces";
import type { PcId } from "../../game/types";
import { BunkMotion, type BunkMotionFrame } from "./bunkMotion";
import { BUNK_CSS_PROPS, type BunkVisualFrame, bunkVisualFrame } from "./bunkMotionView";
import { BunkPiecePhysics, type BunkPiecePose } from "./bunkPiecePhysics";

interface BunkPieceView {
  readonly group: Group;
  readonly dynamicsBody: Group;
}

export class BunkSceneMotion {
  private readonly motion: BunkMotion = new BunkMotion();
  private readonly physics: BunkPiecePhysics = new BunkPiecePhysics();
  private active: boolean = false;

  constructor(
    private readonly pivot: Group,
    private readonly pcs: ReadonlyMap<PcId, BunkPieceView>,
    private readonly backdrop: HTMLElement | null,
  ) {}

  get isActive(): boolean {
    return this.active;
  }

  reset(ofs: Readonly<Vector3>, baseY: number): void {
    this.active = false;
    this.motion.reset();
    this.physics.reset();
    this.pivot.rotation.set(0, 0, 0);
    this.pivot.position.set(ofs.x, baseY, ofs.z);
    if (this.backdrop) {
      for (const prop of BUNK_CSS_PROPS) this.backdrop.style.removeProperty(prop);
    }
    for (const vw of this.pcs.values()) {
      vw.group.rotation.set(0, 0, 0);
      vw.dynamicsBody.position.set(0, 0, 0);
      vw.dynamicsBody.rotation.set(0, 0, 0);
    }
  }

  step(secs: number, ofs: Readonly<Vector3>, baseY: number): void {
    this.active = true;
    const motion: BunkMotionFrame = this.motion.step(secs);
    const frame: BunkVisualFrame = bunkVisualFrame(motion, ofs.x, ofs.z, baseY);
    const { board } = frame;
    this.pivot.rotation.set(board.pitch, board.yaw, board.roll);
    this.pivot.position.set(board.x, board.y, board.z);

    if (this.backdrop) {
      for (const prop of BUNK_CSS_PROPS) {
        this.backdrop.style.setProperty(prop, frame.css[prop]);
      }
    }

    this.physics.advance(secs, motion);
    for (const pcId of GAME_PIECES) {
      const vw: BunkPieceView | undefined = this.pcs.get(pcId);
      if (!vw) continue;
      const pose: BunkPiecePose = this.physics.pose(pcId);
      vw.group.rotation.set(pose.pitch, 0, pose.roll);
      vw.dynamicsBody.position.set(pose.x, pose.lift, pose.z);
    }
  }
}
