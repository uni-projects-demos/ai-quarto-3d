import type { JSX } from "react";
import { translate } from "../i18n/i18n";
import { GAME_THEMES, type ThemeDef } from "../themes";
import { themePrevOrder } from "./themePrevOrder";

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
    >
      <ul className="theme-preview-list">
        {themePrevOrder(themes).map((theme) => (
          <li className="theme-preview-item" key={theme.id}>
            <button
              type="button"
              className="theme-preview-card"
              data-theme-id={theme.id}
              aria-label={translate("themes.playTheme", { theme: translate(theme.nameKey) })}
              style={{ "--preview-accent": theme.accent }}
              disabled
            >
              <span className="theme-preview-image">
                <img src={theme.previewImage} alt="" width={1048} height={632} decoding="async" />
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
      <p id="theme-launch-status" className="theme-launch-status" role="status" hidden />
    </section>
  );
}
