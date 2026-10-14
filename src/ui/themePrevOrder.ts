import { curLang, translate } from "../i18n/i18n";
import type { ThemeDef } from "../themes";

export function themePrevOrder(themes: readonly ThemeDef[]): ThemeDef[] {
  let collator: Intl.Collator;
  try {
    collator = new Intl.Collator(curLang(), { sensitivity: "base" });
  } catch {
    collator = new Intl.Collator("en", { sensitivity: "base" });
  }
  return [...themes].sort((left, right): number =>
    collator.compare(translate(left.nameKey), translate(right.nameKey)),
  );
}
