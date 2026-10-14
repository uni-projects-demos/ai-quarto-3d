type ElementClass<T extends Element> = abstract new (...args: never[]) => T;

export function requiredEl<T extends Element>(
  id: string,
  type: ElementClass<T>,
  root: ParentNode = document,
): T {
  const element = root.querySelector(`#${id}`);
  if (!(element instanceof type)) throw new Error(`Missing or invalid required element #${id}`);
  return element;
}

export function controlLabel(element: HTMLElement, lbl: string): void {
  element.setAttribute("aria-label", lbl);
  element.title = lbl;
}

export function fitText(element: HTMLElement, minSize = 12): boolean {
  element.style.fontSize = "";
  const style = getComputedStyle(element);
  const naturalSize = Number.parseFloat(style.fontSize);
  const padding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
  const available = element.clientWidth - padding;
  const content = element.scrollWidth - padding;
  if (!Number.isFinite(naturalSize) || available <= 0 || content <= available) return true;
  let size = Math.max(minSize, (naturalSize * available) / content);
  element.style.fontSize = `${size}px`;
  while (element.scrollWidth > element.clientWidth && size > minSize) {
    size = Math.max(minSize, size - 0.25);
    element.style.fontSize = `${size}px`;
  }
  return element.scrollWidth <= element.clientWidth;
}
