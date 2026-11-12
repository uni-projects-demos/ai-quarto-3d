import type { TranslationKey } from "./i18n/types";

export interface ThemeMetadata {
  readonly nameKey: TranslationKey;
  readonly accent: string;
  readonly panelInk: string;
  readonly panelMuted: string;
  readonly panelSurface: string;
  readonly panelHover: string;
  readonly panelBorder: string;
  readonly actionBackground: string;
  readonly actionInk: string;
  readonly actionHover: string;
  readonly winHighlight: string;
  readonly winInk: string;
  readonly isEnabled: boolean;
}

export interface ThemeDef extends ThemeMetadata {
  readonly id: ThemeId;
}

export const THEME_REG = {
  marble: {
    nameKey: "themes.marble",
    accent: "#deceb4",
    panelInk: "#28231d",
    panelMuted: "#514538",
    panelSurface: "#c7b597",
    panelHover: "#bca787",
    panelBorder: "#74614d",
    actionBackground: "#544130",
    actionInk: "#fff9ef",
    actionHover: "#473525",
    winHighlight: "#1e6571",
    winInk: "#fff9ef",
    isEnabled: true,
  },
  victorian: {
    nameKey: "themes.victorian",
    accent: "#563343",
    panelInk: "#f5e9d8",
    panelMuted: "#ebd7c6",
    panelSurface: "#392533",
    panelHover: "#492e3d",
    panelBorder: "#baa384",
    actionBackground: "#ad9579",
    actionInk: "#24181b",
    actionHover: "#bea88d",
    winHighlight: "#e5c38a",
    winInk: "#24181b",
    isEnabled: true,
  },
  nature: {
    nameKey: "themes.nature",
    accent: "#7b8d4c",
    panelInk: "#152219",
    panelMuted: "#152219",
    panelSurface: "#dce7ba",
    panelHover: "#eaf0d9",
    panelBorder: "#354321",
    actionBackground: "#1f3621",
    actionInk: "#fff9ef",
    actionHover: "#29462b",
    winHighlight: "#efdf9c",
    winInk: "#22301a",
    isEnabled: true,
  },
  flogsta: {
    nameKey: "themes.flogsta",
    accent: "#b54e47",
    panelInk: "#fff4ec",
    panelMuted: "#fff0e9",
    panelSurface: "#803531",
    panelHover: "#96413d",
    panelBorder: "#ebbbaf",
    actionBackground: "#e3e8e6",
    actionInk: "#25343b",
    actionHover: "#f1f2ee",
    winHighlight: "#d8e9e6",
    winInk: "#25343b",
    isEnabled: true,
  },
} as const satisfies Record<string, ThemeMetadata>;

export type ThemeId = keyof typeof THEME_REG;
function isRegisteredTheme(val: string): val is ThemeId {
  return Object.hasOwn(THEME_REG, val);
}

const reg = Object.keys(THEME_REG).filter(isRegisteredTheme);
export const GAME_THEMES: readonly ThemeDef[] = reg
  .filter((id) => THEME_REG[id].isEnabled)
  .map((id): ThemeDef => ({ ...THEME_REG[id], id }));
export const DEFAULT_THEME: ThemeId = (() => {
  const first = GAME_THEMES[0]?.id ?? reg[0];
  if (first === undefined) throw new Error("No themes are registered");
  return first;
})();

export function themeColKeys(thm: ThemeId): {
  dark: "piece.green" | "piece.black";
  light: "piece.white" | "piece.red";
} {
  return thm === "nature"
    ? { dark: "piece.green", light: "piece.white" }
    : { dark: "piece.black", light: thm === "flogsta" ? "piece.white" : "piece.red" };
}

export function isThemeId(val: unknown): val is ThemeId {
  return typeof val === "string" && isRegisteredTheme(val) && THEME_REG[val].isEnabled;
}

export function adjacentTheme(cur: ThemeId, dir: -1 | 1, thms: readonly ThemeDef[]): ThemeId {
  if (thms.length === 0) return DEFAULT_THEME;
  const idx: number = thms.findIndex((thm: ThemeDef): boolean => thm.id === cur);
  if (idx < 0) return thms[0]?.id ?? DEFAULT_THEME;
  const nxt: number = (idx + dir + thms.length) % thms.length;
  return thms[nxt]?.id ?? DEFAULT_THEME;
}
