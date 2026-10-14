const GAP = 16;
const IMAGE_ASPECT = 1048 / 632;
const LABEL_HEIGHT = 46;
const MIN_CARD_WIDTH = 160;

export function themePrevLayout(
  count: number,
  width: number,
  height: number,
): { columns: number; cardWidth: number } {
  if (count < 1 || width <= 0 || height <= 0) return { columns: 0, cardWidth: 0 };
  const minimum = Math.min(MIN_CARD_WIDTH, width);
  const maxColumns = Math.min(
    Math.ceil(Math.sqrt(count)),
    Math.max(1, Math.floor((width + GAP) / (minimum + GAP))),
  );
  let best = { columns: 1, cardWidth: 0 };
  for (let columns = 1; columns <= maxColumns; columns += 1) {
    const rows = Math.ceil(count / columns);
    const availableWidth = (width - (columns - 1) * GAP) / columns;
    const availableHeight = (height - (rows - 1) * GAP) / rows;
    const cardWidth = Math.min(availableWidth, (availableHeight - LABEL_HEIGHT) * IMAGE_ASPECT);
    if (cardWidth >= minimum && cardWidth > best.cardWidth) best = { columns, cardWidth };
  }
  return best.cardWidth > 0
    ? best
    : { columns: maxColumns, cardWidth: (width - (maxColumns - 1) * GAP) / maxColumns };
}
