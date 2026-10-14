import { pieceStr, TRAIT_MASK } from "../game/pieces";
import { getTraitMask, getWinLines, sumWinCells } from "../game/rules";
import { type GameState, getTurnPlayer, toggleTurn } from "../game/state";
import type { Cell, Difficulty, GameMode, PieceId, Turn, WinLine } from "../game/types";
import { curLang, diffLabel, translate, transTraits } from "../i18n/i18n";
import { controlLabel } from "../shared/dom";
import type { ThemeId } from "../themes";

export interface Elements {
  readonly binCells: HTMLElement[];
  readonly binWinOverlay: SVGSVGElement;
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

  constructor(private readonly elements: Elements) {}

  updateHistControl(state: GameViewState): void {
    const canNavigate: boolean = state.canNavigate;
    this.elements.undo.disabled = !canNavigate || state.histIdx <= 0;
    this.elements.redo.disabled = !canNavigate || state.histIdx >= state.histLength;

    const undoLbl: string = translate("controls.undo");
    controlLabel(this.elements.undo, undoLbl);

    const redoLbl: string = translate("controls.redo");
    controlLabel(this.elements.redo, redoLbl);
  }

  updateUI(state: GameViewState): void {
    this.renderBinBoard(state);
    this.elements.status.hidden = !state.hasStarted;
    const startLabel = state.hasStarted ? "app.newGame" : "app.start";
    this.elements.newGame.dataset.i18n = startLabel;
    this.elements.newGame.textContent = translate(startLabel);

    const isTurnAI: boolean =
      !state.isReview &&
      state.phase === "thinking" &&
      getTurnPlayer(state.gameMode, state.activeTurn) === "ai";
    this.elements.status.classList.toggle("is-ai", isTurnAI);
    this.elements.status.classList.toggle("is-paused", isTurnAI && state.isPauseAI);
    this.elements.statusDots.hidden = !isTurnAI;
    this.elements.pauseToggleAI.hidden = !isTurnAI;

    const pauseControlLabel: string = translate(
      state.isPauseAI ? "controls.resumeAI" : "controls.pauseAI",
    );
    controlLabel(this.elements.pauseToggleAI, pauseControlLabel);
    this.elements.pauseToggleAI.setAttribute("aria-pressed", String(state.isPauseAI));
    this.updateHistControl(state);
    this.renderRisk(state);
    this.renderPendingPiece(state);

    if (!state.hasStarted) {
      return;
    }

    if (state.phase === "finished") {
      const finMsg: string =
        state.winner === "draw"
          ? translate("status.gameDrawn")
          : translate("status.gameWon", {
              player: state.winner === null ? "" : this.finTurnLbl(state.winner, state),
            });
      this.elements.statusLbl.textContent = finMsg.replace(/\.+$/, "");
      return;
    }

    if (isTurnAI) {
      const actor: string = this.getTurnLblAI(state.activeTurn, state);
      if (state.isPauseAI) {
        this.elements.statusLbl.textContent = translate("status.pausedAI", { player: actor });
      } else if (state.stepAI === "place") {
        this.elements.statusLbl.textContent = translate("status.placingAI", { player: actor });
      } else {
        this.elements.statusLbl.textContent = translate("status.selectingAI", {
          player: actor,
          opponent: this.selectionOppLblAI(state.activeTurn, state),
        });
      }
      return;
    }

    const actor: string = this.userTurnLbl(state.activeTurn);
    const opponent: string = this.userSelectOppLbl(state.activeTurn, state);
    const isUserVsAI: boolean = state.gameMode === "human-ai" && state.activeTurn === "player1";
    this.elements.statusLbl.textContent =
      state.phase === "place"
        ? isUserVsAI
          ? translate("status.placeUserYou")
          : translate("status.placingUser", { player: actor })
        : isUserVsAI
          ? translate("status.selectUserYou", { opponent })
          : translate("status.selectUser", { player: actor, opponent });
  }

  renderRisk(state: GameViewState): void {
    const mode: GameMode = state.gameMode;
    const isEnabled: boolean = state.isRiskEnabled;

    this.elements.riskToggle.textContent = translate(isEnabled ? "common.on" : "common.off");
    this.elements.riskToggle.setAttribute("aria-pressed", String(isEnabled));
    this.elements.riskToggle.classList.toggle("is-off", !isEnabled);
    const toggleLbl: string = translate(isEnabled ? "metrics.turnRiskOff" : "metrics.turnRiskOn");
    controlLabel(this.elements.riskToggle, toggleLbl);

    if (mode === "ai-ai") {
      this.elements.riskLatest.textContent = "—";
      this.elements.riskLatest.setAttribute("aria-label", translate("metrics.riskUnavailableAI"));
      return;
    }

    if (!isEnabled) {
      this.elements.riskLatest.textContent = "—";
      this.elements.riskLatest.setAttribute("aria-label", translate("metrics.riskTurnedOff"));
      return;
    }

    let risk: number | null = null;
    let src: "hover" | "ai" | null = null;

    if (
      !state.isReview &&
      state.phase === "select" &&
      getTurnPlayer(state.gameMode, state.activeTurn) === "human" &&
      state.hoveredPiece !== null &&
      state.remaining.includes(state.hoveredPiece)
    ) {
      risk = sumWinCells(state.board, state.hoveredPiece);
      src = "hover";
    }

    if (mode === "human-ai") {
      if (
        !state.isReview &&
        state.activeTurn === "player2" &&
        state.phase === "thinking" &&
        state.stepAI === "select" &&
        state.nxtPieceAI !== null &&
        state.remaining.includes(state.nxtPieceAI)
      ) {
        risk = sumWinCells(state.board, state.nxtPieceAI);
        src = "ai";
      }

      if (
        !state.isReview &&
        state.activeTurn === "player1" &&
        state.phase === "place" &&
        state.pendingPiece !== null
      ) {
        risk = sumWinCells(state.board, state.pendingPiece);
        src = "ai";
      }
    }

    this.elements.riskLatest.textContent = risk === null ? "—" : String(risk);
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
    this.elements.riskLatest.setAttribute("aria-label", riskLbl);
  }

  renderPendingPiece(state: GameViewState): void {
    if (state.pendingPiece === null) {
      this.elements.pieceName.textContent = translate("piece.none");
      this.elements.pieceStr.textContent = "----";
      return;
    }
    this.elements.pieceName.textContent = transTraits(state.pendingPiece, state.theme);
    this.elements.pieceStr.textContent = pieceStr(state.pendingPiece);
  }

  private renderWinBinBits(element: HTMLElement, piece: PieceId, winTraits = 0): void {
    const pieceBinStr: string = pieceStr(piece);

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
    element.replaceChildren(...bits);
  }

  renderBinBoard(state: GameViewState): void {
    const winLines: WinLine[] = state.phase === "finished" ? getWinLines(state.board) : [];
    const showWinLine: boolean = winLines.length > 0;
    const winTraitsByCell = new Map<number, number>();
    for (const winLine of winLines) {
      const winTraits: number = getTraitMask(state.board, winLine);
      for (const cell of winLine) {
        winTraitsByCell.set(cell, (winTraitsByCell.get(cell) ?? 0) | winTraits);
      }
    }

    for (const [cell, element] of this.elements.binCells.entries()) {
      const piece: Cell | undefined = state.board[cell];
      const winTraits: number = winTraitsByCell.get(cell) ?? 0;
      const isWinCell: boolean = showWinLine && winTraitsByCell.has(cell);
      const key = `${piece ?? "empty"}:${winTraits}:${curLang()}`;
      if (this.binKeys[cell] === key) continue;
      this.binKeys[cell] = key;
      element.classList.toggle("win", isWinCell);

      if (piece === null || piece === undefined) {
        element.textContent = "----";
        element.classList.remove("occupied");
        element.setAttribute("aria-label", translate("board.cellEmpty", { cell: cell + 1 }));
        continue;
      }

      const pieceBinStr: string = pieceStr(piece);
      this.renderWinBinBits(element, piece, winTraits);
      element.classList.add("occupied");
      element.setAttribute(
        "aria-label",
        translate("board.cellPiece", { cell: cell + 1, piece: pieceBinStr }),
      );
    }
    this.elements.binWinOverlay.toggleAttribute("hidden", !showWinLine);
  }

  userTurnLbl(turn: Turn): string {
    return translate(turn === "player1" ? "player.playerOne" : "player.playerTwo");
  }

  private getTurnLblAI(turn: Turn, state: GameViewState): string {
    const difficulty: string = diffLabel(state.diffByTurn[turn]);
    if (state.gameMode === "ai-ai") {
      return translate("player.playerNumberedAI", {
        number: turn === "player1" ? "1" : "2",
        difficulty,
      });
    }
    return translate("player.playerAI", { difficulty });
  }

  private userSelectOppLbl(turn: Turn, state: GameViewState): string {
    if (state.gameMode === "human-ai") return translate("player.playerAIPlayer");
    return this.userTurnLbl(toggleTurn(turn));
  }

  private selectionOppLblAI(turn: Turn, state: GameViewState): string {
    if (state.gameMode === "human-ai") return translate("player.playerYou");
    const opponent: Turn = toggleTurn(turn);
    return translate("player.playerShort", { number: opponent === "player1" ? "1" : "2" });
  }

  private finTurnLbl(turn: Turn, state: GameViewState): string {
    if (state.gameMode === "human-ai" && turn === "player2") {
      return translate("player.playerAIPlayer");
    }
    return this.userTurnLbl(turn);
  }
}
