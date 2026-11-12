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
  type ThemeMetadata,
  themeColKeys,
} from "../themes";
import { readThemePref, saveThemePref, THEME_STORAGE_KEY } from "./themePref";
import { themePrevOrder } from "./themePrevOrder";

export class ThemeController {
  private readonly cleanup = new Cleanup();
  private cur: ThemeId = DEFAULT_THEME;
  private readonly nm: HTMLElement;
  private readonly lyt: HTMLElement;
  private readonly prev: HTMLButtonElement;
  private readonly nxt: HTMLButtonElement;

  constructor(
    private readonly scn: Pick<GameScene, "setTheme">,
    private readonly scr: HTMLElement,
    private readonly switcher: HTMLElement,
    private readonly onChange?: () => void,
    initThm: ThemeId = readThemePref(),
  ) {
    this.nm = requiredEl("theme-name", HTMLElement, switcher);
    this.lyt = requiredEl("game-layout", HTMLElement);
    this.prev = requiredEl("theme-previous", HTMLButtonElement, switcher);
    this.nxt = requiredEl("theme-next", HTMLButtonElement, switcher);

    const opts = { signal: this.cleanup.signal };
    this.prev.addEventListener("click", (): void => this.move(-1), opts);
    this.nxt.addEventListener("click", (): void => this.move(1), opts);
    this.switcher.addEventListener(
      "keydown",
      (evt: KeyboardEvent): void => {
        if (evt.key !== "ArrowLeft" && evt.key !== "ArrowRight") return;
        evt.preventDefault();
        this.move(evt.key === "ArrowLeft" ? -1 : 1);
      },
      opts,
    );
    this.cleanup.add(onLangChange(this.updateName));
    const nameObs = new ResizeObserver(this.fitName);
    nameObs.observe(this.nm);
    this.cleanup.add((): void => nameObs.disconnect());
    window.addEventListener(
      "storage",
      (evt: StorageEvent): void => {
        if (evt.key === THEME_STORAGE_KEY || evt.key === null) this.apply(readThemePref(), false);
      },
      opts,
    );
    this.apply(initThm, false);
    this.prev.disabled = GAME_THEMES.length < 2;
    this.nxt.disabled = GAME_THEMES.length < 2;
  }

  dispose(): void {
    this.cleanup.dispose();
  }

  select(thm: ThemeId): void {
    this.apply(thm, true);
  }

  private move(dir: -1 | 1): void {
    this.apply(adjacentTheme(this.cur, dir, themePrevOrder(GAME_THEMES)), true);
  }

  private apply(thm: ThemeId, persist: boolean): void {
    if (this.cleanup.signal.aborted) return;
    this.cur = thm;
    this.scn.setTheme(thm);
    this.scr.dataset.theme = thm;
    const pal: ThemeMetadata = THEME_REG[thm];
    const root: HTMLElement = document.documentElement;
    root.style.setProperty("--settings-background", pal.accent);
    root.style.setProperty("--settings-ink", pal.panelInk);
    root.style.setProperty("--settings-muted", pal.panelMuted);
    root.style.setProperty("--settings-surface", pal.panelSurface);
    root.style.setProperty("--settings-hover", pal.panelHover);
    root.style.setProperty("--settings-border", pal.panelBorder);
    root.style.setProperty("--settings-action-background", pal.actionBackground);
    root.style.setProperty("--settings-action-hover", pal.actionHover);
    root.style.setProperty("--settings-action-ink", pal.actionInk);
    root.style.setProperty("--settings-win-background", pal.winHighlight);
    root.style.setProperty("--settings-win-ink", pal.winInk);
    this.lyt.style.setProperty("--control-accent", pal.accent);
    this.lyt.style.setProperty("--control-action-ink", pal.actionInk);
    this.updateName();
    this.onChange?.();
    if (persist) saveThemePref(thm);
  }

  private readonly updateName = (): void => {
    const key = THEME_REG[this.cur].nameKey;
    this.nm.dataset.i18n = key;
    this.nm.textContent = translate(key);
    this.nm.title = translate(key);
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
    this.nm.classList.remove("is-multiline");
    if (!fitText(this.nm)) {
      this.nm.style.fontSize = "";
      this.nm.classList.add("is-multiline");
    }
  };
}
