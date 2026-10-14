import { onLangChange, translate } from "../i18n/i18n";
import { Cleanup } from "../shared/Cleanup";
import { requiredEl } from "../shared/dom";
import { GAME_THEMES, isThemeId, type ThemeId } from "../themes";
import { themePrevLayout } from "./themePrevLayout";
import { themePrevOrder } from "./themePrevOrder";

export class ThemePickerController {
  private readonly cleanup = new Cleanup();
  private starting = false;
  private readonly buttons: HTMLButtonElement[];
  private readonly status: HTMLElement;

  constructor(
    private readonly root: HTMLElement,
    private readonly onSelect: (theme: ThemeId) => void,
  ) {
    this.buttons = [...root.querySelectorAll<HTMLButtonElement>("[data-theme-id]")];
    this.status = requiredEl("theme-launch-status", HTMLElement, root);
    for (const button of this.buttons) {
      button.disabled = false;
      button.addEventListener(
        "click",
        (): void => {
          const theme = button.dataset.themeId;
          if (theme && isThemeId(theme)) this.select(theme);
        },
        { signal: this.cleanup.signal },
      );
    }
    this.cleanup.add(onLangChange(this.updateLabels));
    const resizeObs = new ResizeObserver(this.fitPreviews);
    resizeObs.observe(root);
    this.cleanup.add((): void => resizeObs.disconnect());
    this.updateLabels();
  }

  dispose(): void {
    this.starting = true;
    for (const button of this.buttons) button.disabled = true;
    this.cleanup.dispose();
  }

  dismiss(): void {
    this.starting = true;
    this.root.hidden = true;
  }

  private select(theme: ThemeId): void {
    if (this.starting) return;
    this.starting = true;
    this.root.setAttribute("aria-busy", "true");
    for (const button of this.buttons) button.disabled = true;
    try {
      this.onSelect(theme);
    } catch (err) {
      this.starting = false;
      this.root.setAttribute("aria-busy", "false");
      this.status.dataset.i18n = "themes.loadError";
      this.status.textContent = translate("themes.loadError");
      this.status.hidden = false;
      for (const button of this.buttons) button.disabled = false;
      console.error(err);
    }
  }

  private readonly updateLabels = (): void => {
    for (const def of themePrevOrder(GAME_THEMES)) {
      const button = this.buttons.find((button) => button.dataset.themeId === def.id);
      if (!button) continue;
      button.setAttribute(
        "aria-label",
        translate("themes.playTheme", { theme: translate(def.nameKey) }),
      );
      const item = button.closest(".theme-preview-item");
      item?.parentElement?.append(item);
    }
    this.fitPreviews();
  };

  private readonly fitPreviews = (): void => {
    if (this.root.hidden) return;
    const style = getComputedStyle(this.root);
    const width =
      this.root.clientWidth -
      Number.parseFloat(style.paddingLeft) -
      Number.parseFloat(style.paddingRight);
    const height =
      this.root.clientHeight -
      Number.parseFloat(style.paddingTop) -
      Number.parseFloat(style.paddingBottom);
    const layout = themePrevLayout(this.buttons.length, width, height);
    this.root.style.setProperty("--preview-card-width", `${layout.cardWidth}px`);
  };
}
