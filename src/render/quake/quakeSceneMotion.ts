import type { Group } from "three";
import type { PcId } from "../../game/types";
import { CanterburyAftershocks, type QuakeRotation } from "./quakeAftershocks";

interface QuakePieceView {
  readonly group: Group;
}

export class QuakeSceneMotion {
  private readonly aftershocks: CanterburyAftershocks = new CanterburyAftershocks();

  constructor(
    private readonly pivot: Group,
    private readonly pcs: ReadonlyMap<PcId, QuakePieceView>,
  ) {}

  reset(): void {
    this.aftershocks.reset();
  }

  step(secs: number): boolean {
    let isNeedRender: boolean = false;
    const motion: QuakeRotation = this.aftershocks.step(secs);
    if (
      this.pivot.rotation.x !== motion.pitch ||
      this.pivot.rotation.z !== motion.roll ||
      this.pivot.rotation.y !== motion.yaw
    ) {
      this.pivot.rotation.set(motion.pitch, motion.yaw, motion.roll);
      isNeedRender = true;
    }
    for (const [pc, vw] of this.pcs) {
      const wobble: QuakeRotation = this.aftershocks.pieceWobble(pc);
      if (vw.group.rotation.x !== wobble.pitch || vw.group.rotation.z !== wobble.roll) {
        vw.group.rotation.set(wobble.pitch, 0, wobble.roll);
        isNeedRender = true;
      }
    }
    return isNeedRender;
  }
}
