const GAP = 16;
const LBL_HEIGHT = 50;
const MIN_CARD_WIDTH = 128;

export function themePrevLayout(
  count: number,
  width: number,
  height: number,
  imgAspect: number,
): { cols: number; cardWidth: number } {
  if (count < 1 || width <= 0 || height <= 0) return { cols: 0, cardWidth: 0 };
  const min = Math.min(MIN_CARD_WIDTH, width);
  const maxCols = Math.min(
    Math.ceil(Math.sqrt(count)),
    Math.max(1, Math.floor((width + GAP) / (min + GAP))),
  );
  let best = { cols: 1, cardWidth: 0 };
  for (let cols = 1; cols <= maxCols; cols += 1) {
    const rows = Math.ceil(count / cols);
    const cardWidth = Math.min(
      (width - (cols - 1) * GAP) / cols,
      ((height - (rows - 1) * GAP) / rows - LBL_HEIGHT) * imgAspect,
    );
    if (cardWidth >= min && cardWidth > best.cardWidth) best = { cols, cardWidth };
  }
  return best.cardWidth > 0
    ? best
    : { cols: maxCols, cardWidth: (width - (maxCols - 1) * GAP) / maxCols };
}
