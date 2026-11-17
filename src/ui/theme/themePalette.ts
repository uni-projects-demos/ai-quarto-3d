import { THEME_REG, type ThemeId } from "../../themes";

export function applyThemePalette(theme: ThemeId): void {
  const pal = THEME_REG[theme];
  const style = document.documentElement.style;
  style.setProperty("--settings-background", pal.accent);
  style.setProperty("--settings-ink", pal.panelInk);
  style.setProperty("--settings-muted", pal.panelMuted);
  style.setProperty("--settings-surface", pal.panelSurface);
  style.setProperty("--settings-hover", pal.panelHover);
  style.setProperty("--settings-border", pal.panelBorder);
  style.setProperty("--settings-action-background", pal.actionBackground);
  style.setProperty("--settings-action-hover", pal.actionHover);
  style.setProperty("--settings-action-ink", pal.actionInk);
  style.setProperty("--settings-win-background", pal.winHighlight);
  style.setProperty("--settings-win-ink", pal.winInk);
}
