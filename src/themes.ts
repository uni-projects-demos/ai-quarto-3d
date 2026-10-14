import marblePreview from "./assets/theme-previews/marble.webp";
import naturePreview from "./assets/theme-previews/nature.webp";
import victorianPreview from "./assets/theme-previews/victorian.webp";
import type { TranslationKey } from "./i18n/types";

export interface ThemeMetadata {
  readonly nameKey: TranslationKey;
  readonly previewImage: string;
  readonly accent: string;
  readonly enabled: boolean;
}

export interface ThemeDef extends ThemeMetadata {
  readonly id: ThemeId;
}

export const THEME_REG = {
  marble: {
    nameKey: "themes.marble",
    previewImage: marblePreview,
    accent: "#c3d7de",
    enabled: true,
  },
  victorian: {
    nameKey: "themes.victorian",
    previewImage: victorianPreview,
    accent: "#e4bb72",
    enabled: true,
  },
  nature: {
    nameKey: "themes.nature",
    previewImage: naturePreview,
    accent: "#a9c3a0",
    enabled: true,
  },
} as const satisfies Record<string, ThemeMetadata>;

export type ThemeId = keyof typeof THEME_REG;
function isRegisteredTheme(val: string): val is ThemeId {
  return Object.hasOwn(THEME_REG, val);
}

const registered = Object.keys(THEME_REG).filter(isRegisteredTheme);
export const GAME_THEMES: readonly ThemeDef[] = registered
  .filter((id) => THEME_REG[id].enabled)
  .map((id): ThemeDef => ({ ...THEME_REG[id], id }));
export const DEFAULT_THEME: ThemeId = (() => {
  const first = GAME_THEMES[0]?.id ?? registered[0];
  if (first === undefined) throw new Error("No themes are registered");
  return first;
})();

export function themeColKeys(theme: ThemeId): {
  dark: "piece.green" | "piece.black";
  light: "piece.white" | "piece.red";
} {
  return theme === "nature"
    ? { dark: "piece.green", light: "piece.white" }
    : { dark: "piece.black", light: "piece.red" };
}

export function isThemeId(val: unknown): val is ThemeId {
  return typeof val === "string" && isRegisteredTheme(val) && THEME_REG[val].enabled;
}

export function adjacentTheme(cur: ThemeId, dir: -1 | 1): ThemeId {
  const idx: number = GAME_THEMES.findIndex((theme) => theme.id === cur);
  const nxt: number = (idx + dir + GAME_THEMES.length) % GAME_THEMES.length;
  return GAME_THEMES[nxt]?.id ?? DEFAULT_THEME;
}
