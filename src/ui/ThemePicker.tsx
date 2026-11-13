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
  themes = GAME_THEMES,
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
        {themePrevOrder(themes).map((theme: ThemeDef) => (
          <li className="theme-preview-item" key={theme.id}>
            <button
              type="button"
              className="theme-preview-card"
              data-theme-id={theme.id}
              aria-label={translate("themes.playTheme", { theme: translate(theme.nameKey) })}
              style={
                {
                  "--preview-accent": theme.accent,
                  "--preview-ink": theme.panelInk,
                  "--preview-border": theme.panelBorder,
                } satisfies ThemePreviewStyle
              }
              disabled
            >
              <span className="theme-preview-image">
                <span
                  className="game-screen theme-preview-scene"
                  data-theme={theme.id}
                  aria-hidden="true"
                >
                  <SceneBackdrop />
                  <canvas className="theme-preview-render" />
                </span>
              </span>
              <strong className="theme-preview-name" data-i18n={theme.nameKey}>
                {translate(theme.nameKey)}
              </strong>
            </button>
          </li>
        ))}
      </ul>
      <p className="theme-picker-empty" data-i18n="themes.empty" hidden={themes.length > 0}>
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
