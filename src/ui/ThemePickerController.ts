import { onLangChange, translate } from "../i18n/i18n";
import { Cleanup } from "../shared/Cleanup";
import { requiredEl } from "../shared/dom";
import { GAME_THEMES, isThemeId, type ThemeId } from "../themes";
import { themePrevOrder } from "./themePrevOrder";

export class ThemePickerController {
  private readonly cleanup = new Cleanup();
  private isStarting = false;
  private readonly btns: HTMLButtonElement[];
  private readonly stat: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly onSelect: (thm: ThemeId) => void,
    private readonly fitPreviews: () => void,
  ) {
    this.btns = [...root.querySelectorAll<HTMLButtonElement>("[data-theme-id]")];
    this.stat = requiredEl("theme-launch-status", HTMLElement, root);
    for (const btn of this.btns) {
      btn.disabled = false;
      btn.addEventListener(
        "click",
        (): void => {
          const thm = btn.dataset.themeId;
          if (thm && isThemeId(thm)) this.select(thm);
        },
        { signal: this.cleanup.signal },
      );
    }
    this.cleanup.add(onLangChange(this.updateLabels));
    this.updateLabels();
  }

  dispose(): void {
    this.isStarting = true;
    for (const btn of this.btns) btn.disabled = true;
    this.cleanup.dispose();
  }

  dismiss(): void {
    this.isStarting = true;
    this.root.hidden = true;
  }

  private select(thm: ThemeId): void {
    if (this.isStarting) return;
    this.isStarting = true;
    this.root.setAttribute("aria-busy", "true");
    for (const btn of this.btns) btn.disabled = true;
    try {
      this.onSelect(thm);
    } catch (err) {
      this.isStarting = false;
      this.root.setAttribute("aria-busy", "false");
      this.stat.dataset.i18n = "themes.loadError";
      this.stat.textContent = translate("themes.loadError");
      this.stat.hidden = false;
      for (const btn of this.btns) btn.disabled = false;
      console.error(err);
    }
  }

  private readonly updateLabels = (): void => {
    for (const def of themePrevOrder(GAME_THEMES)) {
      const btn = this.btns.find((btn) => btn.dataset.themeId === def.id);
      if (!btn) continue;
      btn.setAttribute(
        "aria-label",
        translate("themes.playTheme", { theme: translate(def.nameKey) }),
      );
      const item = btn.closest(".theme-preview-item");
      item?.parentElement?.append(item);
    }
    this.fitPreviews();
  };
}
