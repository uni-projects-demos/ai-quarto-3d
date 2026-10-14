import { onLangChange, translate } from "../i18n/i18n";
import type { GameScene } from "../render/GameScene";
import { Cleanup } from "../shared/Cleanup";
import { fitText, requiredEl } from "../shared/dom";
import {
  adjacentTheme,
  DEFAULT_THEME,
  GAME_THEMES,
  THEME_REG,
  type ThemeId,
  themeColKeys,
} from "../themes";
import { readThemePref, saveThemePref, THEME_STORAGE_KEY } from "./themePref";

export class ThemeController {
  private readonly cleanup = new Cleanup();
  private cur: ThemeId = DEFAULT_THEME;
  private readonly name: HTMLElement;
  private readonly prev: HTMLButtonElement;
  private readonly nxt: HTMLButtonElement;

  constructor(
    private readonly scene: Pick<GameScene, "setTheme">,
    private readonly screen: HTMLElement,
    private readonly switcher: HTMLElement,
    private readonly onChange?: () => void,
    initialTheme: ThemeId = readThemePref(),
  ) {
    this.name = requiredEl("theme-name", HTMLElement, switcher);
    this.prev = requiredEl("theme-previous", HTMLButtonElement, switcher);
    this.nxt = requiredEl("theme-next", HTMLButtonElement, switcher);

    const options = { signal: this.cleanup.signal };
    this.prev.addEventListener("click", (): void => this.move(-1), options);
    this.nxt.addEventListener("click", (): void => this.move(1), options);
    this.switcher.addEventListener(
      "keydown",
      (event: KeyboardEvent): void => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        this.move(event.key === "ArrowLeft" ? -1 : 1);
      },
      options,
    );
    this.cleanup.add(onLangChange(this.updateName));
    const nameObs = new ResizeObserver(this.fitName);
    nameObs.observe(this.name);
    this.cleanup.add((): void => nameObs.disconnect());
    window.addEventListener(
      "storage",
      (event: StorageEvent): void => {
        if (event.key === THEME_STORAGE_KEY || event.key === null)
          this.apply(readThemePref(), false);
      },
      options,
    );
    this.apply(initialTheme, false);
    this.prev.disabled = GAME_THEMES.length < 2;
    this.nxt.disabled = GAME_THEMES.length < 2;
  }

  dispose(): void {
    this.cleanup.dispose();
  }

  select(theme: ThemeId): void {
    this.apply(theme, true);
  }

  private move(dir: -1 | 1): void {
    this.apply(adjacentTheme(this.cur, dir), true);
  }

  private apply(theme: ThemeId, persist: boolean): void {
    if (this.cleanup.signal.aborted) return;
    this.cur = theme;
    this.scene.setTheme(theme);
    this.screen.dataset.theme = theme;
    this.updateName();
    this.onChange?.();
    if (persist) saveThemePref(theme);
  }

  private readonly updateName = (): void => {
    const key = THEME_REG[this.cur].nameKey;
    this.name.dataset.i18n = key;
    this.name.textContent = translate(key);
    this.name.title = translate(key);
    const cols = themeColKeys(this.cur);
    for (const [id, colKey] of [
      ["trait-dark-label", cols.dark],
      ["trait-light-label", cols.light],
    ] as const) {
      const lbl = document.getElementById(id);
      if (lbl && colKey) {
        lbl.dataset.i18n = colKey;
        lbl.textContent = translate(colKey);
      }
    }
    this.fitName();
  };

  private readonly fitName = (): void => {
    this.name.classList.remove("is-multiline");
    if (!fitText(this.name)) {
      this.name.style.fontSize = "";
      this.name.classList.add("is-multiline");
    }
  };
}
