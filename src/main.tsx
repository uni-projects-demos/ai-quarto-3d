import "./style.scss";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import App from "./App";
import { initI18n, translate } from "./i18n/i18n";
import { initLangPicker } from "./i18n/lang-picker";
import { Cleanup, type Dispose } from "./shared/Cleanup";
import { fitText, requiredEl } from "./shared/dom";
import { DEFAULT_THEME, GAME_THEMES, type ThemeId } from "./themes";
import type GameController from "./ui/GameController";
import { ThemePickerController } from "./ui/ThemePickerController";
import { fitThemePreviews } from "./ui/themePrevLayout";

function setupTitleFit(): Dispose {
  const title: HTMLHeadingElement = requiredEl("app-title", HTMLHeadingElement);
  const hdr: HTMLElement | null = title.closest<HTMLElement>(".info-header");
  if (hdr === null) return (): void => {};

  const fitTitle = (): void => {
    fitText(title);
  };

  const resizeObs: ResizeObserver = new ResizeObserver(fitTitle);
  resizeObs.observe(hdr);
  const mutationObs: MutationObserver = new MutationObserver(fitTitle);
  mutationObs.observe(title, { childList: true, characterData: true, subtree: true });
  fitTitle();
  return (): void => {
    resizeObs.disconnect();
    mutationObs.disconnect();
  };
}

const cleanup = new Cleanup();
let disposed = false;

const appRoot: HTMLElement = requiredEl("app", HTMLElement);
const reactRoot: Root = createRoot(appRoot);
flushSync((): void => {
  reactRoot.render(<App />);
});

const cvs: HTMLCanvasElement = requiredEl("game-canvas", HTMLCanvasElement);
const stat: HTMLElement = requiredEl("game-status", HTMLElement);
const statusLbl: HTMLElement = requiredEl("game-status-label", HTMLElement);

const pickerRoot: HTMLElement = requiredEl("theme-selection", HTMLElement);
let renderPreviews: (() => void) | null = null;
const fitPreviews = (): void => {
  if (pickerRoot.hidden) return;
  fitThemePreviews(pickerRoot, GAME_THEMES.length);
  renderPreviews?.();
};
const previewResizeObs: ResizeObserver = new ResizeObserver(fitPreviews);
previewResizeObs.observe(pickerRoot);
cleanup.add((): void => previewResizeObs.disconnect());
fitPreviews();

async function preloadThemeBackgrounds(root: HTMLElement): Promise<HTMLImageElement[]> {
  const urls = new Set<string>();
  for (const el of root.querySelectorAll<HTMLElement>(
    ".marble-interior, .nature-landscape, .victorian-wall, .flogsta-balcony",
  )) {
    for (const match of getComputedStyle(el).backgroundImage.matchAll(
      /url\(["']?([^"')]+)["']?\)/g,
    )) {
      const url = match[1];
      if (url) urls.add(url);
    }
  }
  return Promise.all(
    [...urls].map(async (url): Promise<HTMLImageElement> => {
      const img = new Image();
      img.src = url;
      await img.decode();
      return img;
    }),
  );
}

function showStartupErr(err: unknown): void {
  requiredEl("theme-selection", HTMLElement).hidden = true;
  cvs.hidden = true;
  stat.hidden = false;
  stat.classList.remove("is-ai", "is-paused");
  stat.classList.add("is-error");
  statusLbl.textContent = translate("error.renderingStatus");

  const fb: HTMLDivElement = document.createElement("div");
  const heading: HTMLElement = document.createElement("strong");
  const msg: HTMLSpanElement = document.createElement("span");

  fb.className = "webgl-error";
  heading.textContent = translate("error.webglHeading");
  msg.textContent = translate("error.webglMsg");
  fb.append(heading, msg);
  cvs.parentElement?.append(fb);

  console.error(err);
}

async function prepareGame(): Promise<void> {
  const [{ GameScene }, { default: GameControllerClass }, { ThemeController }] = await Promise.all([
    import("./render/GameScene"),
    import("./ui/GameController"),
    import("./ui/ThemeController"),
  ]);
  try {
    if (disposed) return;
    let controller: GameController | null = null;
    let picker: ThemePickerController | null = null;
    let selectedTheme: ThemeId = DEFAULT_THEME;
    const scr = requiredEl("game-screen", HTMLElement);
    const switcher = requiredEl("theme-switcher", HTMLElement);
    const startButton = requiredEl("new-game", HTMLButtonElement);
    cvs.hidden = true;
    const scn = new GameScene(cvs, {
      onCellClick: (cell: number): void => controller?.handleCellClick(cell),
      onPieceClick: (pc): void => controller?.handlePieceClick(pc),
      onPieceHover: (pc): void => controller?.handlePieceHover(pc),
    });

    cleanup.add((): void => scn.dispose());
    const prevws = new Map<ThemeId, HTMLCanvasElement>();
    for (const def of GAME_THEMES) {
      const prevw = pickerRoot.querySelector<HTMLCanvasElement>(
        `[data-theme-id="${def.id}"] .theme-preview-render`,
      );
      if (!prevw) throw new Error(`Missing preview for ${def.id}`);
      prevws.set(def.id, prevw);
    }
    const [backgrounds] = await Promise.all([
      preloadThemeBackgrounds(scr),
      scn.preloadThemes(prevws),
    ]);
    cleanup.add((): void => {
      backgrounds.length = 0;
    });
    if (disposed) return;
    cvs.hidden = false;

    const thms = new ThemeController(
      scn,
      scr,
      switcher,
      (): void => controller?.refreshTheme(),
      DEFAULT_THEME,
    );

    cleanup.add((): void => thms.dispose());

    controller = new GameControllerClass(
      scn,
      {
        binCells: [...document.querySelectorAll<HTMLElement>("[data-binary-cell]")],
        diffAI: requiredEl("diff", HTMLSelectElement),
        diffPlayerOneAI: requiredEl("diff-p-one", HTMLSelectElement),
        diffPlayerTwoAI: requiredEl("diff-p-two", HTMLSelectElement),
        gameMode: requiredEl("game-mode", HTMLSelectElement),
        status: stat,
        statusLbl,
        newGame: startButton,
        pauseToggleAI: requiredEl("ai-pause-toggle", HTMLButtonElement),
        pieceName: requiredEl("piece-name", HTMLElement),
        pieceStr: requiredEl("piece-str", HTMLElement),
        redo: requiredEl("redo", HTMLButtonElement),
        risk: requiredEl("selection-risk", HTMLElement),
        riskLatest: requiredEl("selection-risk-latest", HTMLElement),
        riskToggle: requiredEl("selection-risk-toggle", HTMLButtonElement),
        starter: requiredEl("starter", HTMLSelectElement),
        statusDots: requiredEl("status-dots", HTMLElement),
        undo: requiredEl("undo", HTMLButtonElement),
        wrapDiffAI: requiredEl("diff-wrap", HTMLElement),
        wrapDiffPlayerOneAI: requiredEl("diff-p-one-wrap", HTMLElement),
        wrapDiffPlayerTwoAI: requiredEl("diff-p-two-wrap", HTMLElement),
      },
      (): void => {
        thms.select(selectedTheme);
        picker?.dismiss();
        switcher.hidden = false;
        scr.setAttribute("tabindex", "-1");
        scr.focus({ preventScroll: true });
      },
    );
    const gameController = controller;
    cleanup.add((): void => gameController.dispose());
    renderPreviews = (): void => scn.renderThemePreviews(prevws);
    cleanup.add((): void => {
      renderPreviews = null;
    });
    picker = new ThemePickerController(
      pickerRoot,
      (thm): void => {
        selectedTheme = thm;
        controller?.start();
      },
      fitPreviews,
    );
    const themePicker = picker;
    cleanup.add((): void => themePicker.dispose());
    pickerRoot.setAttribute("aria-busy", "false");
    requiredEl("theme-launch-status", HTMLElement, pickerRoot).hidden = true;
    startButton.disabled = GAME_THEMES.length === 0;
  } catch (err) {
    cleanup.dispose();
    if (!disposed) showStartupErr(err);
  }
}

async function startApp(): Promise<void> {
  cleanup.add(await initI18n());
  if (disposed) return;
  cleanup.add(setupTitleFit());
  cleanup.add(initLangPicker());
  await prepareGame();
}

if (import.meta.hot) {
  import.meta.hot.dispose((): void => {
    disposed = true;
    cleanup.dispose();
    reactRoot.unmount();
  });
}

void startApp().catch((err: unknown): void => {
  cleanup.dispose();
  if (!disposed) showStartupErr(err);
});
