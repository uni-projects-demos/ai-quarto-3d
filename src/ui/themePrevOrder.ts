import { curLang, translate } from "../i18n/i18n";
import type { ThemeDef } from "../themes";

export function themePrevOrder(themes: readonly ThemeDef[]): ThemeDef[] {
  let coll: Intl.Collator;
  try {
    coll = new Intl.Collator(curLang(), { sensitivity: "base" });
  } catch {
    coll = new Intl.Collator("en", { sensitivity: "base" });
  }
  return [...themes].sort((left: ThemeDef, right: ThemeDef): number => {
    const diff: number = coll.compare(translate(left.nameKey), translate(right.nameKey));
    return diff || left.id.localeCompare(right.id);
  });
}
