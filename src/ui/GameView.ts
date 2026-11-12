import { pieceStr, TRAIT_MASK } from "../game/pieces";
import { getTraitMask, getWinLines, sumWinCells } from "../game/rules";
import { type GameState, getTurnPlayer, toggleTurn } from "../game/state";
import type { Cell, Difficulty, GameMode, PieceId, Turn, WinLine } from "../game/types";
import { curLang, diffLabel, translate, transTraits } from "../i18n/i18n";
import { controlLabel } from "../shared/dom";
import type { ThemeId } from "../themes";

export interface Elements {
  readonly binCells: HTMLElement[];
  readonly diffAI: HTMLSelectElement;
  readonly diffPlayerOneAI: HTMLSelectElement;
  readonly diffPlayerTwoAI: HTMLSelectElement;
  readonly gameMode: HTMLSelectElement;
  readonly status: HTMLElement;
  readonly statusLbl: HTMLElement;
  readonly newGame: HTMLButtonElement;
  readonly pauseToggleAI: HTMLButtonElement;
  readonly pieceName: HTMLElement;
  readonly pieceStr: HTMLElement;
  readonly redo: HTMLButtonElement;
  readonly risk: HTMLElement;
  readonly riskLatest: HTMLElement;
  readonly riskToggle: HTMLButtonElement;
  readonly starter: HTMLSelectElement;
  readonly statusDots: HTMLElement;
  readonly undo: HTMLButtonElement;
  readonly wrapDiffAI: HTMLElement;
  readonly wrapDiffPlayerOneAI: HTMLElement;
  readonly wrapDiffPlayerTwoAI: HTMLElement;
}

export interface GameViewState extends GameState {
  readonly hasStarted: boolean;
  readonly isReview: boolean;
  readonly isPauseAI: boolean;
  readonly isRiskEnabled: boolean;
  readonly hoveredPiece: PieceId | null;
  readonly histIdx: number;
  readonly histLength: number;
  readonly canNavigate: boolean;
  readonly gameMode: GameMode;
  readonly diffByTurn: Readonly<Record<Turn, Difficulty>>;
  readonly theme: ThemeId;
}

export class GameView {
  private readonly binKeys: string[] = [];

  constructor(private readonly els: Elements) {}

  updateHistControl(st: GameViewState): void {
    const canNavigate: boolean = st.canNavigate;
    this.els.undo.disabled = !canNavigate || st.histIdx <= 0;
    this.els.redo.disabled = !canNavigate || st.histIdx >= st.histLength;

    const undoLbl: string = translate("controls.undo");
    controlLabel(this.els.undo, undoLbl);

    const redoLbl: string = translate("controls.redo");
    controlLabel(this.els.redo, redoLbl);
  }

  updateUI(st: GameViewState): void {
    this.renderBinBoard(st);
    this.els.status.hidden = !st.hasStarted;
    const startLabel = st.hasStarted ? "app.newGame" : "app.start";
    this.els.newGame.dataset.i18n = startLabel;
    this.els.newGame.textContent = translate(startLabel);

    const isTurnAI: boolean =
      !st.isReview && st.phase === "thinking" && getTurnPlayer(st.gameMode, st.activeTurn) === "ai";
    this.els.status.classList.toggle("is-ai", isTurnAI);
    this.els.status.classList.toggle("is-paused", isTurnAI && st.isPauseAI);
    this.els.statusDots.hidden = !isTurnAI;
    this.els.pauseToggleAI.hidden = !isTurnAI;

    const pauseControlLabel: string = translate(
      st.isPauseAI ? "controls.resumeAI" : "controls.pauseAI",
    );
    controlLabel(this.els.pauseToggleAI, pauseControlLabel);
    this.els.pauseToggleAI.setAttribute("aria-pressed", String(st.isPauseAI));
    this.updateHistControl(st);
    this.renderRisk(st);
    this.renderPendingPiece(st);

    if (!st.hasStarted) {
      return;
    }

    if (st.phase === "finished") {
      const finMsg: string =
        st.winner === "draw"
          ? translate("status.gameDrawn")
          : translate("status.gameWon", {
              player: st.winner === null ? "" : this.finTurnLbl(st.winner, st),
            });
      this.els.statusLbl.textContent = finMsg.replace(/\.+$/, "");
      return;
    }

    if (isTurnAI) {
      const actor: string = this.getTurnLblAI(st.activeTurn, st);
      if (st.isPauseAI) {
        this.els.statusLbl.textContent = translate("status.pausedAI", { player: actor });
      } else if (st.stepAI === "place") {
        this.els.statusLbl.textContent = translate("status.placingAI", { player: actor });
      } else {
        this.els.statusLbl.textContent = translate("status.selectingAI", {
          player: actor,
          opponent: this.selectionOppLblAI(st.activeTurn, st),
        });
      }
      return;
    }

    const actor: string = this.userTurnLbl(st.activeTurn);
    const opp: string = this.userSelectOppLbl(st.activeTurn, st);
    const isUserVsAI: boolean = st.gameMode === "human-ai" && st.activeTurn === "player1";
    this.els.statusLbl.textContent =
      st.phase === "place"
        ? isUserVsAI
          ? translate("status.placeUserYou")
          : translate("status.placingUser", { player: actor })
        : isUserVsAI
          ? translate("status.selectUserYou", { opponent: opp })
          : translate("status.selectUser", { player: actor, opponent: opp });
  }

  renderRisk(st: GameViewState): void {
    const mode: GameMode = st.gameMode;
    const isEnabled: boolean = st.isRiskEnabled;

    this.els.riskToggle.textContent = translate(isEnabled ? "common.on" : "common.off");
    this.els.riskToggle.setAttribute("aria-pressed", String(isEnabled));
    this.els.riskToggle.classList.toggle("is-off", !isEnabled);
    const toggleLbl: string = translate(isEnabled ? "metrics.turnRiskOff" : "metrics.turnRiskOn");
    controlLabel(this.els.riskToggle, toggleLbl);

    if (mode === "ai-ai") {
      this.els.riskLatest.textContent = "—";
      this.els.riskLatest.setAttribute("aria-label", translate("metrics.riskUnavailableAI"));
      return;
    }

    if (!isEnabled) {
      this.els.riskLatest.textContent = "—";
      this.els.riskLatest.setAttribute("aria-label", translate("metrics.riskTurnedOff"));
      return;
    }

    let risk: number | null = null;
    let src: "hover" | "ai" | null = null;

    if (
      !st.isReview &&
      st.phase === "select" &&
      getTurnPlayer(st.gameMode, st.activeTurn) === "human" &&
      st.hoveredPiece !== null &&
      st.remaining.includes(st.hoveredPiece)
    ) {
      risk = sumWinCells(st.board, st.hoveredPiece);
      src = "hover";
    }

    if (mode === "human-ai") {
      if (
        !st.isReview &&
        st.activeTurn === "player2" &&
        st.phase === "thinking" &&
        st.stepAI === "select" &&
        st.nxtPieceAI !== null &&
        st.remaining.includes(st.nxtPieceAI)
      ) {
        risk = sumWinCells(st.board, st.nxtPieceAI);
        src = "ai";
      }

      if (
        !st.isReview &&
        st.activeTurn === "player1" &&
        st.phase === "place" &&
        st.pendingPiece !== null
      ) {
        risk = sumWinCells(st.board, st.pendingPiece);
        src = "ai";
      }
    }

    this.els.riskLatest.textContent = risk === null ? "—" : String(risk);
    const riskLbl: string =
      risk === null
        ? translate("metrics.hoverRiskPreview")
        : src === "ai"
          ? translate(risk === 1 ? "metrics.riskOneAI" : "metrics.riskManyAI", {
              risk,
            })
          : translate(risk === 1 ? "metrics.hoveredRiskOne" : "metrics.hoveredRiskMany", {
              risk,
            });
    this.els.riskLatest.setAttribute("aria-label", riskLbl);
  }

  renderPendingPiece(st: GameViewState): void {
    if (st.pendingPiece === null) {
      this.els.pieceName.textContent = translate("piece.none");
      this.els.pieceStr.textContent = "----";
      return;
    }
    this.els.pieceName.textContent = transTraits(st.pendingPiece, st.theme);
    this.els.pieceStr.textContent = pieceStr(st.pendingPiece);
  }

  private renderWinBinBits(el: HTMLElement, pc: PieceId, winTraits = 0): void {
    const pieceBinStr: string = pieceStr(pc);

    const bits: HTMLSpanElement[] = [...pieceBinStr].map(
      (bit: string, idx: number): HTMLSpanElement => {
        const span: HTMLSpanElement = document.createElement("span");
        span.textContent = bit;
        span.className = "bin-bit";

        const traitMask: 1 | 2 | 4 | 8 | undefined = TRAIT_MASK[idx];
        if (traitMask !== undefined && (winTraits & traitMask) !== 0) {
          span.classList.add("win-bit");
        }
        return span;
      },
    );
    el.replaceChildren(...bits);
  }

  renderBinBoard(st: GameViewState): void {
    const winLines: WinLine[] = st.phase === "finished" ? getWinLines(st.board) : [];
    const showWinLine: boolean = winLines.length > 0;
    const winTraitsByCell = new Map<number, number>();
    for (const winLine of winLines) {
      const winTraits: number = getTraitMask(st.board, winLine);
      for (const cell of winLine) {
        winTraitsByCell.set(cell, (winTraitsByCell.get(cell) ?? 0) | winTraits);
      }
    }

    for (const [cell, el] of this.els.binCells.entries()) {
      const pc: Cell | undefined = st.board[cell];
      const winTraits: number = winTraitsByCell.get(cell) ?? 0;
      const isWinCell: boolean = showWinLine && winTraitsByCell.has(cell);
      const key = `${pc ?? "empty"}:${winTraits}:${curLang()}`;
      if (this.binKeys[cell] === key) continue;
      this.binKeys[cell] = key;
      el.classList.toggle("win", isWinCell);

      if (pc === null || pc === undefined) {
        el.textContent = "----";
        el.classList.remove("occupied");
        el.setAttribute("aria-label", translate("board.cellEmpty", { cell: cell + 1 }));
        continue;
      }

      const pieceBinStr: string = pieceStr(pc);
      this.renderWinBinBits(el, pc, winTraits);
      el.classList.add("occupied");
      el.setAttribute(
        "aria-label",
        translate("board.cellPiece", { cell: cell + 1, piece: pieceBinStr }),
      );
    }
  }

  userTurnLbl(turn: Turn): string {
    return translate(turn === "player1" ? "player.playerOne" : "player.playerTwo");
  }

  private getTurnLblAI(turn: Turn, st: GameViewState): string {
    const diff: string = diffLabel(st.diffByTurn[turn]);
    if (st.gameMode === "ai-ai") {
      return translate("player.playerNumberedAI", {
        number: turn === "player1" ? "1" : "2",
        difficulty: diff,
      });
    }
    return translate("player.playerAI", { difficulty: diff });
  }

  private userSelectOppLbl(turn: Turn, st: GameViewState): string {
    if (st.gameMode === "human-ai") return translate("player.playerAIPlayer");
    return this.userTurnLbl(toggleTurn(turn));
  }

  private selectionOppLblAI(turn: Turn, st: GameViewState): string {
    if (st.gameMode === "human-ai") return translate("player.playerYou");
    const opp: Turn = toggleTurn(turn);
    return translate("player.playerShort", { number: opp === "player1" ? "1" : "2" });
  }

  private finTurnLbl(turn: Turn, st: GameViewState): string {
    if (st.gameMode === "human-ai" && turn === "player2") {
      return translate("player.playerAIPlayer");
    }
    return this.userTurnLbl(turn);
  }
}
