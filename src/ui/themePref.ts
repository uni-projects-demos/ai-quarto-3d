import { readStorage, saveStorage } from "../shared/storage";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "../themes";

export const THEME_STORAGE_KEY = "quarto-theme";

export function readStoredTheme(): ThemeId | null {
  const stored = readStorage(THEME_STORAGE_KEY);
  return isThemeId(stored) ? stored : null;
}

export function readThemePref(): ThemeId {
  return readStoredTheme() ?? DEFAULT_THEME;
}

export function saveThemePref(theme: ThemeId): void {
  saveStorage(THEME_STORAGE_KEY, theme);
}
