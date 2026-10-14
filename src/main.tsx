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

const canvas: HTMLCanvasElement = requiredEl("game-canvas", HTMLCanvasElement);
const status: HTMLElement = requiredEl("game-status", HTMLElement);
const statusLbl: HTMLElement = requiredEl("game-status-label", HTMLElement);

function showStartupErr(err: unknown): void {
  requiredEl("theme-selection", HTMLElement).hidden = true;
  canvas.hidden = true;
  status.hidden = false;
  status.classList.remove("is-ai", "is-paused");
  status.classList.add("is-error");
  statusLbl.textContent = translate("error.renderingStatus");

  const fb: HTMLDivElement = document.createElement("div");
  const heading: HTMLElement = document.createElement("strong");
  const msg: HTMLSpanElement = document.createElement("span");

  fb.className = "webgl-error";
  heading.textContent = translate("error.webglHeading");
  msg.textContent = translate("error.webglMsg");
  fb.append(heading, msg);
  canvas.parentElement?.append(fb);

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
    const screen = requiredEl("game-screen", HTMLElement);
    const switcher = requiredEl("theme-switcher", HTMLElement);
    const startButton = requiredEl("new-game", HTMLButtonElement);
    const scene = new GameScene(canvas, {
      onCellClick: (cell: number): void => controller?.handleCellClick(cell),
      onPieceClick: (piece): void => controller?.handlePieceClick(piece),
      onPieceHover: (piece): void => controller?.handlePieceHover(piece),
    });

    cleanup.add((): void => scene.dispose());

    const themes = new ThemeController(
      scene,
      screen,
      switcher,
      (): void => controller?.refreshTheme(),
      DEFAULT_THEME,
    );

    cleanup.add((): void => themes.dispose());

    controller = new GameControllerClass(
      scene,
      {
        binCells: [...document.querySelectorAll<HTMLElement>("[data-binary-cell]")],
        binWinOverlay: requiredEl("bin-win-overlay", SVGSVGElement),
        diffAI: requiredEl("diff", HTMLSelectElement),
        diffPlayerOneAI: requiredEl("diff-p-one", HTMLSelectElement),
        diffPlayerTwoAI: requiredEl("diff-p-two", HTMLSelectElement),
        gameMode: requiredEl("game-mode", HTMLSelectElement),
        status,
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
        themes.select(selectedTheme);
        picker?.dismiss();
        switcher.hidden = false;
        screen.setAttribute("tabindex", "-1");
        screen.focus({ preventScroll: true });
      },
    );
    const gameController = controller;
    cleanup.add((): void => gameController.dispose());
    picker = new ThemePickerController(
      requiredEl("theme-selection", HTMLElement),
      (theme): void => {
        selectedTheme = theme;
        controller?.start();
      },
    );
    const themePicker = picker;
    cleanup.add((): void => themePicker.dispose());
    startButton.disabled = GAME_THEMES.length === 0;
  } catch (error) {
    cleanup.dispose();
    if (!disposed) showStartupErr(error);
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
