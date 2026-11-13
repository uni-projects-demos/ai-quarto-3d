type ElementClass<T extends Element> = abstract new (...args: never[]) => T;

export function requiredEl<T extends Element>(
  id: string,
  typ: ElementClass<T>,
  root: ParentNode = document,
): T {
  const el: Element | null = root.querySelector(`#${id}`);
  if (!(el instanceof typ)) throw new Error(`Missing or invalid required element #${id}`);
  return el;
}

export function controlLabel(el: HTMLElement, lbl: string): void {
  el.setAttribute("aria-label", lbl);
  el.title = lbl;
}

export function fitText(el: HTMLElement, minSize = 12): boolean {
  el.style.fontSize = "";
  const style: CSSStyleDeclaration = getComputedStyle(el);
  const naturalSize: number = Number.parseFloat(style.fontSize);
  const padding: number =
    Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
  const available: number = el.clientWidth - padding;
  const content: number = el.scrollWidth - padding;
  if (!Number.isFinite(naturalSize) || available <= 0 || content <= available) return true;
  let size: number = Math.max(minSize, (naturalSize * available) / content);
  el.style.fontSize = `${size}px`;
  while (el.scrollWidth > el.clientWidth && size > minSize) {
    size = Math.max(minSize, size - 0.25);
    el.style.fontSize = `${size}px`;
  }
  return el.scrollWidth <= el.clientWidth;
}
