/// <reference lib="webworker" />

import type { MoveAI, RequestAI, ResponseAI } from "../game/types";
import { isRequestAI } from "./protocol";
import { findMoveAI } from "./search";

declare const self: DedicatedWorkerGlobalScope;
const worker: DedicatedWorkerGlobalScope = self;

function res(response: ResponseAI): void {
  worker.postMessage(response);
}

worker.onmessage = ({ data }: MessageEvent<unknown>): void => {
  if (!isRequestAI(data)) return;
  const { reqId }: RequestAI = data;

  try {
    const move: MoveAI = findMoveAI(data.board, data.remaining, data.curPiece, data.diff, {
      startCell: data.startCell,
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
  } catch (error: unknown) {
    res({
      type: "error",
      reqId,
      msg: error instanceof Error ? error.message : "Unknown AI error",
    });
  }
};
