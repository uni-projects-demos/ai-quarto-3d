import type { JSX } from "react";
import type { Difficulty, GameMode, Starter } from "../game/types";
import type { TranslationKey } from "../i18n/types";

interface ControlOption<T extends string> {
  val: T;
  key: TranslationKey;
  lbl: string;
}

const GAME_MODES = [
  { val: "human-human", key: "mode.userVsUser", lbl: "User vs user" },
  { val: "human-ai", key: "mode.userVsAI", lbl: "User vs AI" },
  { val: "ai-ai", key: "mode.onlyAI", lbl: "AI vs AI" },
] satisfies readonly ControlOption<GameMode>[];
const STARTERS = [
  { val: "random", key: "player.playerRandom", lbl: "Random" },
  { val: "player1", key: "player.playerOne", lbl: "Player One" },
  { val: "player2", key: "player.playerTwo", lbl: "Player Two" },
] satisfies readonly ControlOption<Starter>[];
const DIFFICULTIES = [
  { val: "easy", key: "diff.easy", lbl: "Easy" },
  { val: "medium", key: "diff.medium", lbl: "Medium" },
  { val: "hard", key: "diff.hard", lbl: "Hard" },
] satisfies readonly ControlOption<Difficulty>[];
const DIFF_CONTROLS = [
  {
    id: "diff",
    wrap: "diff-wrap",
    key: "controls.diffAI",
    lbl: "AI difficulty",
    val: "medium",
    wide: true,
    hidden: false,
  },
  {
    id: "diff-p-one",
    wrap: "diff-p-one-wrap",
    key: "controls.diffPlayerOneAI",
    lbl: "P1 difficulty",
    val: "hard",
    wide: false,
    hidden: true,
  },
  {
    id: "diff-p-two",
    wrap: "diff-p-two-wrap",
    key: "controls.diffPlayerTwoAI",
    lbl: "P2 difficulty",
    val: "hard",
    wide: false,
    hidden: true,
  },
] satisfies readonly {
  id: string;
  wrap: string;
  key: TranslationKey;
  lbl: string;
  val: Difficulty;
  wide: boolean;
  hidden: boolean;
}[];

function Options<T extends string>({
  options: opts,
}: {
  options: readonly ControlOption<T>[];
}): JSX.Element {
  return (
    <>
      {opts.map(({ val, key, lbl }) => (
        <option key={val} value={val} data-i18n={key}>
          {lbl}
        </option>
      ))}
    </>
  );
}

function HistIcon({ dir }: { dir: "undo" | "redo" }): JSX.Element {
  return dir === "undo" ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 7 4 12l5 5" />
      <path d="M5 12h8a6 6 0 0 1 6 6" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m15 7 5 5-5 5" />
      <path d="M19 12h-8a6 6 0 0 0-6 6" />
    </svg>
  );
}

export function GameControls(): JSX.Element {
  return (
    <section
      className="game-controls"
      aria-label="Game controls"
      data-i18n-aria-label="a11y.gameControls"
    >
      <div className="control-grid">
        <label>
          <span data-i18n="controls.gameMode">Game mode</span>
          <select id="game-mode" defaultValue="human-ai">
            <Options options={GAME_MODES} />
          </select>
        </label>

        <label>
          <span data-i18n="controls.startingPlayer">Starting player</span>
          <select id="starter" defaultValue="random">
            <Options options={STARTERS} />
          </select>
        </label>

        {DIFF_CONTROLS.map((control) => (
          <label
            key={control.id}
            id={control.wrap}
            className={control.wide ? "control-wide" : undefined}
            hidden={control.hidden}
          >
            <span data-i18n={control.key}>{control.lbl}</span>
            <select id={control.id} defaultValue={control.val}>
              <Options options={DIFFICULTIES} />
            </select>
          </label>
        ))}
      </div>

      <div className="action-row">
        <button
          id="new-game"
          className="primary action-new"
          type="button"
          data-i18n="app.start"
          disabled
        >
          Start
        </button>
        <button
          id="undo"
          className="icon-button"
          type="button"
          aria-label="Undo"
          title="Undo"
          data-i18n-aria-label="controls.undo"
          data-i18n-title="controls.undo"
          disabled
        >
          <HistIcon dir="undo" />
        </button>
        <button
          id="redo"
          className="icon-button"
          type="button"
          aria-label="Redo"
          title="Redo"
          data-i18n-aria-label="controls.redo"
          data-i18n-title="controls.redo"
          disabled
        >
          <HistIcon dir="redo" />
        </button>
      </div>
    </section>
  );
}
