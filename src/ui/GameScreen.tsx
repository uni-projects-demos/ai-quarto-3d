import type { JSX } from "react";
import { SceneBackdrop } from "./SceneBackdrop";
import { ThemePicker } from "./ThemePicker";

function PauseIcon(): JSX.Element {
  return (
    <>
      <svg className="pause-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8 6v12M16 6v12" />
      </svg>
      <svg className="play-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="m9 6 9 6-9 6Z" />
      </svg>
    </>
  );
}

export function GameScreen(): JSX.Element {
  return (
    <section
      id="game-screen"
      className="game-screen"
      data-theme="marble"
      aria-label="3D game board"
      data-i18n-aria-label="a11y.gameBoard"
    >
      <SceneBackdrop />
      <canvas id="game-canvas" />
      <div id="game-status" className="game-status" role="status" aria-live="polite" hidden>
        <span id="status-dots" className="status-dots" hidden aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <strong id="game-status-label" data-i18n="status.loading">
          Gameplay status...
        </strong>
        <button
          id="ai-pause-toggle"
          className="status-toggle"
          type="button"
          aria-label="Pause AI"
          title="Pause AI"
          data-i18n-aria-label="controls.pauseAI"
          data-i18n-title="controls.pauseAI"
          hidden
        >
          <PauseIcon />
        </button>
      </div>
      <fieldset
        id="theme-switcher"
        className="theme-switcher"
        aria-label="Theme"
        data-i18n-aria-label="themes.label"
        hidden
      >
        <button
          id="theme-previous"
          className="theme-arrow"
          type="button"
          aria-label="Previous theme"
          title="Previous theme"
          data-i18n-aria-label="themes.previous"
          data-i18n-title="themes.previous"
          disabled
        >
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
            <path d="M26 16H6M14 8L6 16L14 24" />
          </svg>
        </button>
        <div className="theme-scroll">
          <div className="theme-ribbon">
            <span className="ribbon-fold ribbon-fold-left" aria-hidden="true" />
            <span className="ribbon-fold ribbon-fold-right" aria-hidden="true" />
            <div className="ribbon-face">
              <span className="theme-caption" data-i18n="themes.label">
                Theme
              </span>
              <output
                id="theme-name"
                className="theme-name"
                aria-live="polite"
                data-i18n="themes.marble"
              >
                Marble
              </output>
            </div>
          </div>
        </div>
        <button
          id="theme-next"
          className="theme-arrow"
          type="button"
          aria-label="Next theme"
          title="Next theme"
          data-i18n-aria-label="themes.next"
          data-i18n-title="themes.next"
          disabled
        >
          <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
            <path d="M6 16H26M18 8L26 16L18 24" />
          </svg>
        </button>
      </fieldset>
      <ThemePicker />
    </section>
  );
}
