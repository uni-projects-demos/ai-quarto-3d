import type { JSX } from "react";
import { CELL_COUNT } from "../game/rules";
import { GameControls } from "./GameControls";
import { LanguageToggle } from "./LanguageToggle";

const BIN_CELLS = Array.from({ length: CELL_COUNT }, (_, cell) => `binary-cell-${cell}`);

function GitHubIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .7a11.3 11.3 0 0 0-3.6 22c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.2-1.3-1.5-1.3-1.5-1-.7.1-.7.1-.7 1.2.1 1.8 1.3 1.8 1.3 1.1 1.8 2.9 1.3 3.6 1 .1-.8.4-1.3.8-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.5 1.2a12 12 0 0 1 6.4 0A4.8 4.8 0 0 1 18.7 5c.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1 .8 2v3c0 .3.2.7.8.6A11.3 11.3 0 0 0 12 .7Z" />
    </svg>
  );
}

function InfoHeader(): JSX.Element {
  return (
    <header className="info-header">
      <h1 id="app-title" data-i18n="app.title">
        AI-Quarto 3D
      </h1>
      <div className="utility-actions" data-i18n-aria-label="a11y.utilityActions">
        <LanguageToggle id="language-toggle" codeId="locale-code" />
        <a
          className="utility-button github-link"
          href="https://github.com/r055a/ai-quarto-3d"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View source on GitHub"
          title="View source on GitHub"
          data-i18n-aria-label="a11y.viewSource"
          data-i18n-title="a11y.viewSource"
        >
          <GitHubIcon />
        </a>
      </div>
    </header>
  );
}

function BinaryBoard(): JSX.Element {
  return (
    <section className="bin-board-card">
      <div className="bin-board-heading">
        <h3 data-i18n="board.binary">Binary board</h3>
        <span data-i18n="board.piecesPlaced">Placed pieces</span>
      </div>
      <div className="bin-board-wrap">
        <div id="bin-board" className="bin-board">
          {BIN_CELLS.map((id, cell) => (
            <code key={id} data-binary-cell={cell}>
              ----
            </code>
          ))}
        </div>
      </div>
    </section>
  );
}

function SelectionRisk(): JSX.Element {
  return (
    <section
      id="selection-risk"
      className="selection-risk-section"
      aria-labelledby="selection-risk-title"
    >
      <div className="selection-risk-card">
        <div className="selection-risk-trigger">
          <div>
            <h3 id="selection-risk-title" data-i18n="metrics.selectionRisk">
              Selection risk
            </h3>
            <span data-i18n="metrics.immediateWins">Immediate winning placements</span>
          </div>
          <div className="selection-risk-trigger-meta">
            <strong id="selection-risk-latest" data-i18n-aria-label="metrics.latestRisk">
              —
            </strong>
            <button
              id="selection-risk-toggle"
              className="selection-risk-toggle"
              type="button"
              aria-label="Turn selection risk off"
              aria-pressed="true"
              title="Turn selection risk off"
              data-i18n="common.on"
              data-i18n-aria-label="metrics.turnRiskOff"
              data-i18n-title="metrics.turnRiskOff"
            >
              ON
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function GameInfo(): JSX.Element {
  return (
    <aside className="game-info" aria-label="Game information" data-i18n-aria-label="a11y.gameInfo">
      <InfoHeader />
      <GameControls />

      <section className="received-card">
        <span data-i18n="piece.inPlay">Piece in play</span>
        <strong id="piece-name" data-i18n="piece.none">
          None selected
        </strong>
        <code id="piece-str">----</code>
      </section>

      <section className="legend">
        <h3 data-i18n="piece.traits">Piece traits</h3>
        <div>
          <code>1</code>
          <span id="trait-dark-label" data-i18n="piece.black">
            Black
          </span>
          <span data-i18n="piece.big">Big</span>
          <span data-i18n="piece.round">Round</span>
          <span data-i18n="piece.solid">Solid</span>
        </div>
        <div>
          <code>0</code>
          <span id="trait-light-label" data-i18n="piece.red">
            Red
          </span>
          <span data-i18n="piece.small">Small</span>
          <span data-i18n="piece.square">Square</span>
          <span data-i18n="piece.hollow">Hollow</span>
        </div>
      </section>

      <BinaryBoard />
      <SelectionRisk />

      <footer className="ported-note">
        <span data-i18n="app.eyebrow">A ported enhancement of</span>{" "}
        <span>uni-git-projects/uu-game</span>
      </footer>
    </aside>
  );
}
