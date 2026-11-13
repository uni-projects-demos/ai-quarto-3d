import { getRandVal, selectStartCell, selectStartPiece } from "../ai/opening";
import { isResponseAI } from "../ai/protocol";
import { GAME_PIECES } from "../game/pieces";
import { CELL_COUNT, getWinLine, isBoardEmpty, isBoardFull, isValidCell } from "../game/rules";
import {
  type GameState,
  getRedoTarget,
  getTurnPlayer,
  getUndoTarget,
  type HistEvent,
  type HistEventType,
  type StepAI,
  toggleTurn,
} from "../game/state";
import type {
  Cell,
  Difficulty,
  GameMode,
  Participant,
  Phase,
  PieceId,
  RequestAI,
  Starter,
  Turn,
} from "../game/types";
import { isDifficulty, isGameMode, isStarter } from "../game/types";
import { onLangChange } from "../i18n/i18n";
import type { GameScene } from "../render/GameScene";
import { Cleanup } from "../shared/Cleanup";
import { type Elements, GameView, type GameViewState } from "./GameView";
import { TimerAI } from "./TimerAI";

interface DeferMoveAI {
  cell: number;
  nxtPiece: PieceId | null;
  reqId: number;
}

class GameController {
  private readonly cleanup: Cleanup = new Cleanup();
  private readonly vw: GameView;
  private isDisposed: boolean = false;
  private isStarted: boolean = false;
  private brd: Cell[] = Array(CELL_COUNT).fill(null);
  private rem: PieceId[] = [...GAME_PIECES];
  private pendingPiece: PieceId | null = null;
  private phase: Phase = "select";
  private actTurn: Turn = "player1";
  private winner: Turn | "draw" | null = null;
  private requestId: number = 0;
  private rnd: () => number = getRandVal();
  private isPauseAI: boolean = false;
  private timerAI: TimerAI | null = null;
  private activeReqAI: RequestAI | null = null;
  private deferMoveAI: DeferMoveAI | null = null;
  private pendRecoverAI: boolean = false;
  private wkr: Worker | null = null;
  private turnId: number = 0;
  private stepAI: StepAI = null;
  private nxtPieceAI: PieceId | null = null;
  private histEvents: HistEvent[] = [];
  private histStates: GameState[] = [];
  private histIdx: number = 0;
  private isReview: boolean = false;
  private hoverPc: PieceId | null = null;
  private isRiskEnabled: boolean = true;

  constructor(
    private readonly scn: Pick<GameScene, "setState" | "getTheme">,
    private readonly els: Elements,
    private readonly onStart?: () => void,
  ) {
    this.vw = new GameView(els);
    this.cleanup.add(
      onLangChange((): void => {
        this.updateStartOptions();
        this.updateUI();
      }),
    );
    const opts = { signal: this.cleanup.signal };
    this.els.pauseToggleAI.addEventListener("click", this.togglePauseAI, opts);
    this.els.newGame.addEventListener("click", (): void => this.start(), opts);
    this.els.starter.addEventListener(
      "change",
      (): void => {
        if (this.isStarted) this.newGame();
      },
      opts,
    );
    this.els.gameMode.addEventListener(
      "change",
      (): void => {
        this.configModeControls();
        if (this.isStarted) this.newGame();
        else this.updateUI();
      },
      opts,
    );
    this.els.undo.addEventListener("click", this.undo, opts);
    this.els.redo.addEventListener("click", this.redo, opts);
    this.els.riskToggle.addEventListener("click", this.toggleRisk, opts);

    for (const control of [this.els.diffAI, this.els.diffPlayerOneAI, this.els.diffPlayerTwoAI]) {
      control.addEventListener(
        "change",
        (): void => {
          this.updateStartOptions();
          this.updateUI();
        },
        opts,
      );
    }
    this.configModeControls();
    this.updateUI();
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.isStarted = false;
    this.cancelAI();
    this.cleanup.dispose();
  }

  start(): void {
    if (this.isDisposed) return;
    if (!this.isStarted) this.onStart?.();
    this.isStarted = true;
    this.configModeControls();
    this.newGame();
  }

  refreshTheme(): void {
    this.renderPendingPiece();
  }

  handlePieceClick(pc: PieceId): void {
    if (
      !this.isStarted ||
      this.isReview ||
      this.phase !== "select" ||
      !this.isTurnUser(this.actTurn) ||
      !this.rem.includes(pc)
    ) {
      return;
    }
    this.passPiece(pc);
  }

  handleCellClick(cell: number): void {
    if (
      !this.isStarted ||
      this.isReview ||
      this.phase !== "place" ||
      !this.isTurnUser(this.actTurn) ||
      this.pendingPiece === null ||
      !isValidCell(this.brd, cell)
    ) {
      return;
    }

    this.placePiece(cell, null);
  }

  handlePieceHover(pc: PieceId | null): void {
    if (!this.isStarted) return;
    const isPreviewSelection: boolean =
      pc !== null &&
      !this.isReview &&
      this.phase === "select" &&
      this.isTurnUser(this.actTurn) &&
      this.rem.includes(pc);

    this.hoverPc = isPreviewSelection ? pc : null;
    this.renderRisk();

    if (!isPreviewSelection || pc === null) {
      this.renderPendingPiece();
      return;
    }
    this.vw.renderPendingPiece({ ...this.captureViewState(), pendingPiece: pc });
  }

  private readonly newGame: () => void = (): void => {
    if (!this.isStarted) return;
    this.cancelAI();
    this.isPauseAI = false;
    this.rnd = getRandVal();
    this.brd = Array(CELL_COUNT).fill(null);
    this.rem = [...GAME_PIECES];
    this.pendingPiece = null;
    this.winner = null;
    this.actTurn = this.getRandomStarter(
      isStarter(this.els.starter.value) ? this.els.starter.value : "random",
    );
    this.phase = "select";
    this.stepAI = null;
    this.nxtPieceAI = null;
    this.isReview = false;
    this.hoverPc = null;
    this.turnId = 0;
    this.histEvents = [];
    this.histStates = [];
    this.histIdx = 0;
    this.startTurn();
    this.histStates = [this.captureGameState()];
    this.updateHistControl();
  };

  private updateStartOptions(): void {
    for (const turn of ["player1", "player2"] as const) {
      const opt: HTMLOptionElement | null = this.els.starter.querySelector<HTMLOptionElement>(
        `option[value="${turn}"]`,
      );
      if (opt !== null) opt.textContent = this.vw.userTurnLbl(turn);
    }
  }

  private configModeControls(): void {
    const mode: GameMode = this.gameMode();
    const isUserVsAi: boolean = mode === "human-ai";
    const isAiVsAi: boolean = mode === "ai-ai";

    this.els.diffAI.disabled = !isUserVsAi;
    this.els.wrapDiffAI.hidden = !isUserVsAi;

    this.els.diffPlayerOneAI.disabled = !isAiVsAi;
    this.els.diffPlayerTwoAI.disabled = !isAiVsAi;
    this.els.wrapDiffPlayerOneAI.hidden = !isAiVsAi;
    this.els.wrapDiffPlayerTwoAI.hidden = !isAiVsAi;

    this.els.risk.hidden = isAiVsAi;

    this.updateStartOptions();
  }

  private startTurn(): void {
    if (this.getTurnPlayer(this.actTurn) === "ai") {
      this.phase = "thinking";
      this.stepAI = this.pendingPiece === null ? "select-open" : "place";
      this.nxtPieceAI = null;
      this.updateUI();
      this.turnScheduleAI(this.pendingPiece === null ? 400 : 650);
      return;
    }
    this.phase = this.pendingPiece === null ? "select" : "place";
    this.isPauseAI = false;
    this.stepAI = null;
    this.nxtPieceAI = null;
    this.updateUI();
  }

  private turnScheduleAI(delayMS: number): void {
    const turnID: number = this.requestId;
    this.timerSetAI(delayMS, (): void => {
      this.turnResumeAI(turnID);
    });
  }

  private turnSelectAI(pc: PieceId | null, turnID: number): void {
    if (!this.isCurTurnAI(turnID) || this.stepAI !== "select") return;
    const selPc: PieceId | null = pc !== null && this.rem.includes(pc) ? pc : (this.rem[0] ?? null);
    if (selPc === null) {
      this.gameFinn("draw");
      return;
    }
    this.passPiece(selPc);
  }

  private turnResumeAI(turnID: number): void {
    if (!this.isCurTurnAI(turnID)) return;
    else if (this.stepAI === "select-open") {
      this.selectStartPieceAI(turnID);
      return;
    } else if (this.stepAI === "place") {
      this.requestMoveAI();
      return;
    } else if (this.stepAI === "select") {
      this.turnSelectAI(this.nxtPieceAI, turnID);
    }
  }

  private isCurTurnAI(turnID = this.requestId): boolean {
    return (
      this.isStarted &&
      !this.isReview &&
      turnID === this.requestId &&
      this.phase === "thinking" &&
      this.getTurnPlayer(this.actTurn) === "ai"
    );
  }

  private selectStartPieceAI(turnID: number): void {
    if (!this.isCurTurnAI(turnID) || this.pendingPiece !== null || this.rem.length === 0) {
      return;
    }
    this.passPiece(selectStartPiece(this.rem, this.rnd));
  }

  private passPiece(pc: PieceId): void {
    const curPlayer: Turn = this.actTurn;
    const turnId: number = this.turnId;

    this.rem = this.rem.filter((bitVal: PieceId): boolean => bitVal !== pc);
    this.pendingPiece = pc;
    this.actTurn = toggleTurn(this.actTurn);
    this.turnId += 1;

    this.startTurn();
    this.saveGameState(curPlayer, turnId, "select");
  }

  private requestMoveAI(): void {
    if (this.pendingPiece === null) return;

    const diff: Difficulty = this.turnDiff(this.actTurn);
    this.activeReqAI = {
      type: "find-move",
      reqId: ++this.requestId,
      board: [...this.brd],
      remaining: [...this.rem],
      curPiece: this.pendingPiece,
      diff,
      ...(isBoardEmpty(this.brd)
        ? {
            startCell: selectStartCell(this.brd, diff, this.rnd),
          }
        : {}),
    };
    this.postActiveReqAI();
  }

  private postActiveReqAI(): void {
    if (this.isReview || this.isPauseAI || this.activeReqAI === null) return;
    this.workerTerminate();
    try {
      this.wkr = new Worker(new URL("../ai/ai.worker.ts", import.meta.url), {
        type: "module",
      });
      this.wkr.addEventListener("message", this.onWorkerMsg);
      this.wkr.addEventListener("error", this.onWorkerErr);
      this.wkr.addEventListener("messageerror", this.onWorkerErr);
      this.wkr.postMessage(this.activeReqAI);
    } catch {
      this.onWorkerErr();
    }
  }

  private readonly onWorkerErr = (): void => {
    if (this.activeReqAI === null) return;
    this.workerTerminate();
    this.activeReqAI = null;
    this.recoverFB();
  };

  private workerTerminate(): void {
    if (this.wkr === null) return;
    this.wkr.removeEventListener("message", this.onWorkerMsg);
    this.wkr.removeEventListener("error", this.onWorkerErr);
    this.wkr.removeEventListener("messageerror", this.onWorkerErr);
    this.wkr.terminate();
    this.wkr = null;
  }

  private readonly togglePauseAI: () => void = (): void => {
    if (this.isReview || this.phase !== "thinking" || this.getTurnPlayer(this.actTurn) !== "ai") {
      return;
    }

    this.isPauseAI = !this.isPauseAI;
    if (this.isPauseAI) {
      this.timerPauseAI();
      this.workerTerminate();
      this.updateUI();
      return;
    }

    this.updateUI();
    if (this.timerAI !== null) {
      this.timerResumeAI();
      return;
    }

    if (this.deferMoveAI !== null) {
      const move: DeferMoveAI = this.deferMoveAI;
      this.deferMoveAI = null;
      this.applyMoveAI(move.cell, move.nxtPiece, move.reqId);
      return;
    }

    if (this.pendRecoverAI) {
      this.pendRecoverAI = false;
      this.recoverFB();
      return;
    }

    this.postActiveReqAI();
  };

  private readonly undo: () => void = (): void => {
    if (!this.isHistNav() || this.histIdx <= 0) return;
    const tgt: number = getUndoTarget(
      this.histEvents,
      this.histIdx,
      this.isReview,
      (action: HistEvent): boolean => this.getTurnPlayer(action.curPlayer) === "ai",
    );
    this.restoreHist(tgt);
  };

  private readonly redo: () => void = (): void => {
    if (!this.isHistNav() || this.histIdx >= this.histEvents.length) return;
    const tgt: number = getRedoTarget(
      this.histEvents,
      this.histIdx,
      this.isReview,
      (action: HistEvent): boolean => this.getTurnPlayer(action.curPlayer) === "ai",
    );
    this.restoreHist(tgt);
  };

  private readonly onWorkerMsg = (evt: MessageEvent<unknown>): void => {
    if (evt.currentTarget !== this.wkr) return;
    const res: unknown = evt.data;
    if (!isResponseAI(res)) {
      this.onWorkerErr();
      return;
    }
    if (
      res.reqId !== this.requestId ||
      res.reqId !== this.activeReqAI?.reqId ||
      res.type === "progress"
    ) {
      return;
    }

    this.workerTerminate();
    this.activeReqAI = null;

    if (res.type === "error") {
      if (this.isPauseAI) {
        this.pendRecoverAI = true;
        return;
      }
      this.recoverFB();
      return;
    }

    if (this.isPauseAI) {
      this.deferMoveAI = {
        cell: res.move.cell,
        nxtPiece: res.move.nxtPiece,
        reqId: res.reqId,
      };
      return;
    }
    this.applyMoveAI(res.move.cell, res.move.nxtPiece, res.reqId);
  };

  private applyMoveAI(
    cell: number,
    nxtPiece: PieceId | null,
    moveRequestId: number = this.requestId,
  ): void {
    if (moveRequestId !== this.requestId || !this.isCurTurnAI() || this.pendingPiece === null) {
      return;
    }

    if (this.isPauseAI) {
      this.deferMoveAI = {
        cell,
        nxtPiece,
        reqId: moveRequestId,
      };
      return;
    }

    if (!isValidCell(this.brd, cell)) {
      this.recoverFB();
      return;
    }

    const selPc =
      nxtPiece !== null && this.rem.includes(nxtPiece) ? nxtPiece : (this.rem[0] ?? null);
    this.placePiece(cell, selPc);
    if (this.phase === "finished") return;
    this.timerSetAI(520, (): void => this.turnSelectAI(selPc, moveRequestId));
  }

  private placePiece(cell: number, nxtPiece: PieceId | null): void {
    const curPlayer = this.actTurn;
    const turnId = this.turnId;
    const isAI = this.getTurnPlayer(curPlayer) === "ai";
    this.brd[cell] = this.pendingPiece;
    this.pendingPiece = null;
    this.stepAI = isAI ? "select" : null;
    this.nxtPieceAI = isAI ? nxtPiece : null;
    if (!this.isGameFinn(curPlayer)) {
      this.phase = isAI ? "thinking" : "select";
      this.updateUI();
    }
    this.saveGameState(curPlayer, turnId, "place");
  }

  private recoverFB(): void {
    if (this.pendingPiece === null) return;

    if (this.isPauseAI) {
      this.pendRecoverAI = true;
      return;
    }

    const cell: number = isBoardEmpty(this.brd)
      ? selectStartCell(this.brd, this.turnDiff(this.actTurn), this.rnd)
      : this.brd.indexOf(null);

    if (cell < 0) {
      this.gameFinn("draw");
      return;
    }
    this.applyMoveAI(cell, this.rem[0] ?? null, this.requestId);
  }

  private isGameFinn(curTurn: Turn): boolean {
    if (getWinLine(this.brd) !== null) {
      this.gameFinn(curTurn);
      return true;
    }
    if (isBoardFull(this.brd)) {
      this.gameFinn("draw");
      return true;
    }
    return false;
  }

  private gameFinn(curTurn: Turn | "draw"): void {
    this.cancelAI();
    this.winner = curTurn;
    this.phase = "finished";
    this.pendingPiece = null;
    this.isPauseAI = false;
    this.stepAI = null;
    this.nxtPieceAI = null;
    this.isReview = true;
    this.updateUI();
  }

  private cancelAI(): void {
    this.requestId += 1;
    this.timerClearAI();
    this.workerTerminate();
    this.activeReqAI = null;
    this.deferMoveAI = null;
    this.pendRecoverAI = false;
  }

  private captureGameState(copy = true): GameState {
    return {
      activeTurn: this.actTurn,
      nxtPieceAI: this.nxtPieceAI,
      stepAI: this.stepAI,
      board: copy ? [...this.brd] : this.brd,
      pendingPiece: this.pendingPiece,
      phase: this.phase,
      remaining: copy ? [...this.rem] : this.rem,
      turnId: this.turnId,
      winner: this.winner,
    };
  }

  private saveGameState(curPlayer: Turn, turnId: number, eventType: HistEventType): void {
    if (this.histIdx < this.histEvents.length) {
      this.histEvents.splice(this.histIdx);
      this.histStates.splice(this.histIdx + 1);
    }

    this.histEvents.push({ curPlayer, eventType, turnId });
    this.histStates.push(this.captureGameState());
    this.histIdx = this.histEvents.length;
    this.updateHistControl();
    this.renderRisk();
  }

  private restoreHist(tgt: number): void {
    const snapshot: GameState | undefined = this.histStates[tgt];
    if (snapshot === undefined) return;

    this.cancelAI();

    this.brd = [...snapshot.board];
    this.rem = [...snapshot.remaining];
    this.pendingPiece = snapshot.pendingPiece;
    this.phase = snapshot.phase;
    this.actTurn = snapshot.activeTurn;
    this.winner = snapshot.winner;
    this.turnId = snapshot.turnId;
    this.stepAI = snapshot.stepAI;
    this.nxtPieceAI = snapshot.nxtPieceAI;
    this.histIdx = tgt;

    const isAIState: boolean =
      !this.isReview && this.phase === "thinking" && this.getTurnPlayer(this.actTurn) === "ai";
    this.isPauseAI = isAIState;
    this.updateUI();

    if (isAIState) {
      const delayMS: number =
        this.stepAI === "select-open" ? 400 : this.stepAI === "select" ? 520 : 650;
      this.turnScheduleAI(delayMS);
    }
  }

  private isHistNav(): boolean {
    return (
      this.isStarted &&
      (this.isReview ||
        this.phase !== "thinking" ||
        this.getTurnPlayer(this.actTurn) !== "ai" ||
        this.isPauseAI)
    );
  }

  private readonly toggleRisk: () => void = (): void => {
    this.isRiskEnabled = !this.isRiskEnabled;
    if (!this.isRiskEnabled) this.hoverPc = null;
    this.renderRisk();
  };

  private captureViewState(): GameViewState {
    return {
      ...this.captureGameState(false),
      isStarted: this.isStarted,
      isReview: this.isReview,
      isPauseAI: this.isPauseAI,
      isRiskEnabled: this.isRiskEnabled,
      hoveredPiece: this.hoverPc,
      histIdx: this.histIdx,
      histLength: this.histEvents.length,
      canNavigate: this.isHistNav(),
      gameMode: this.gameMode(),
      diffByTurn: { player1: this.turnDiff("player1"), player2: this.turnDiff("player2") },
      theme: this.scn.getTheme(),
    };
  }

  private updateUI(): void {
    this.syncScene();
    this.vw.updateUI(this.captureViewState());
  }

  private updateHistControl(): void {
    this.vw.updateHistControl(this.captureViewState());
  }

  private renderRisk(): void {
    this.vw.renderRisk(this.captureViewState());
  }

  private renderPendingPiece(): void {
    this.vw.renderPendingPiece(this.captureViewState());
  }

  private syncScene(): void {
    this.scn.setState({
      board: this.brd,
      remaining: this.rem,
      pendingPiece: this.pendingPiece,
      phase: this.phase,
    });
  }

  private getTurnPlayer(turn: Turn): Participant {
    return getTurnPlayer(this.gameMode(), turn);
  }

  private isTurnUser(turn: Turn): boolean {
    return this.getTurnPlayer(turn) === "human";
  }

  private gameMode(): GameMode {
    const val = this.els.gameMode.value;
    return isGameMode(val) ? val : "human-ai";
  }

  private turnDiff(turn: Turn): Difficulty {
    if (this.gameMode() !== "ai-ai") {
      const val = this.els.diffAI.value;
      return isDifficulty(val) ? val : "medium";
    }
    const val =
      turn === "player1" ? this.els.diffPlayerOneAI.value : this.els.diffPlayerTwoAI.value;
    return isDifficulty(val) ? val : "hard";
  }

  private getRandomStarter(starter: Starter): Turn {
    if (starter !== "random") return starter;
    return this.rnd() < 0.5 ? "player1" : "player2";
  }

  private timerSetAI(delayMS: number, cb: () => void): void {
    this.timerClearAI();
    const timer = new TimerAI(delayMS, (): void => {
      if (this.timerAI !== timer) return;
      this.timerAI = null;
      cb();
    });
    this.timerAI = timer;
    this.timerResumeAI();
  }

  private timerResumeAI(): void {
    if (this.isPauseAI || this.isReview) return;
    this.timerAI?.timerResumeAI();
  }

  private timerPauseAI(): void {
    this.timerAI?.timerPauseAI();
  }

  private timerClearAI(): void {
    this.timerAI?.timerClearAI();
    this.timerAI = null;
  }
}

export default GameController;
