/// <reference lib="webworker" />

import type { MoveAI, RequestAI, ResponseAI } from "../game/types";
import { isRequestAI } from "./protocol";
import { findMoveAI } from "./search";

declare const self: DedicatedWorkerGlobalScope;
const wkr: DedicatedWorkerGlobalScope = self;

function res(resp: ResponseAI): void {
  wkr.postMessage(resp);
}

wkr.onmessage = ({ data: dat }: MessageEvent<unknown>): void => {
  if (!isRequestAI(dat)) return;
  const { reqId }: RequestAI = dat;

  try {
    const move: MoveAI = findMoveAI(dat.board, dat.remaining, dat.curPiece, dat.diff, {
      startCell: dat.startCell,
      onProgress: (depth: number, nodes: number): void => {
        res({
          type: "progress",
          reqId,
          depth,
          nodes,
        });
      },
    });

    res({
      type: "result",
      reqId,
      move,
    });
  } catch (err: unknown) {
    res({
      type: "error",
      reqId,
      msg: err instanceof Error ? err.message : "Unknown AI error",
    });
  }
};
