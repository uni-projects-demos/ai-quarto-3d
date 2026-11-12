import type { CSSProperties, JSX } from "react";
import { translate } from "../i18n/i18n";
import { GAME_THEMES, type ThemeDef } from "../themes";
import { SceneBackdrop } from "./SceneBackdrop";
import { themePrevOrder } from "./themePrevOrder";

interface ThemePreviewStyle extends CSSProperties {
  readonly "--preview-accent": string;
  readonly "--preview-ink": string;
  readonly "--preview-border": string;
}

export function ThemePicker({
  themes: thms = GAME_THEMES,
}: {
  themes?: readonly ThemeDef[];
}): JSX.Element {
  return (
    <section
      id="theme-selection"
      className="theme-picker"
      aria-label={translate("themes.label")}
      data-i18n-aria-label="themes.label"
      aria-busy="true"
    >
      <ul className="theme-preview-list">
        {themePrevOrder(thms).map((thm) => (
          <li className="theme-preview-item" key={thm.id}>
            <button
              type="button"
              className="theme-preview-card"
              data-theme-id={thm.id}
              aria-label={translate("themes.playTheme", { theme: translate(thm.nameKey) })}
              style={
                {
                  "--preview-accent": thm.accent,
                  "--preview-ink": thm.panelInk,
                  "--preview-border": thm.panelBorder,
                } satisfies ThemePreviewStyle
              }
              disabled
            >
              <span className="theme-preview-image">
                <span
                  className="game-screen theme-preview-scene"
                  data-theme={thm.id}
                  aria-hidden="true"
                >
                  <SceneBackdrop />
                  <canvas className="theme-preview-render" />
                </span>
              </span>
              <strong className="theme-preview-name" data-i18n={thm.nameKey}>
                {translate(thm.nameKey)}
              </strong>
            </button>
          </li>
        ))}
      </ul>
      <p className="theme-picker-empty" data-i18n="themes.empty" hidden={thms.length > 0}>
        No themes are currently available.
      </p>
      <p
        id="theme-launch-status"
        className="theme-launch-status"
        role="status"
        data-i18n="themes.loading"
      >
        Loading themes...
      </p>
    </section>
  );
}
