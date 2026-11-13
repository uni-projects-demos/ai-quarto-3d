const GAP = 16;
const LBL_HEIGHT = 50;
const MIN_CARD_WIDTH = 128;

export function themePrevLayout(
  cnt: number,
  wdt: number,
  hgt: number,
  imgAspect: number,
): { cols: number; cardWidth: number } {
  if (cnt < 1 || wdt <= 0 || hgt <= 0) return { cols: 0, cardWidth: 0 };
  const min: number = Math.min(MIN_CARD_WIDTH, wdt);
  const maxCols: number = Math.min(
    Math.ceil(Math.sqrt(cnt)),
    Math.max(1, Math.floor((wdt + GAP) / (min + GAP))),
  );
  let best: { cols: number; cardWidth: number } = { cols: 1, cardWidth: 0 };
  for (let cols: number = 1; cols <= maxCols; cols += 1) {
    const rows: number = Math.ceil(cnt / cols);
    const cardWdt: number = Math.min(
      (wdt - (cols - 1) * GAP) / cols,
      ((hgt - (rows - 1) * GAP) / rows - LBL_HEIGHT) * imgAspect,
    );
    if (cardWdt > best.cardWidth) best = { cols, cardWidth: cardWdt };
  }
  return best.cardWidth > 0
    ? best
    : { cols: maxCols, cardWidth: (wdt - (maxCols - 1) * GAP) / maxCols };
}

export function fitThemePreviews(root: HTMLElement, cnt: number): void {
  if (root.hidden) return;
  const scr: HTMLElement = root.parentElement ?? root;
  const scnWdt: number = Math.max(1, scr.clientWidth);
  const scnHgt: number = Math.max(1, scr.clientHeight);
  const style: CSSStyleDeclaration = getComputedStyle(root);
  const wdt: number =
    scnWdt - Number.parseFloat(style.paddingLeft) - Number.parseFloat(style.paddingRight);
  const hgt: number =
    scnHgt - Number.parseFloat(style.paddingTop) - Number.parseFloat(style.paddingBottom);
  const layout: { cols: number; cardWidth: number } = themePrevLayout(
    cnt,
    wdt,
    hgt,
    scnWdt / scnHgt,
  );
  root.style.setProperty("--preview-card-width", `${layout.cardWidth}px`);
  root.style.setProperty("--preview-aspect", `${scnWdt} / ${scnHgt}`);
  root.style.setProperty("--preview-scene-width", `${scnWdt}px`);
  root.style.setProperty("--preview-scene-height", `${scnHgt}px`);
  root.style.setProperty("--preview-scene-scale", `${(layout.cardWidth - 2) / scnWdt}`);
}
