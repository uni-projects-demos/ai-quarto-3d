import { getPieceTraits, type PieceTraits } from "./game/pieces";
import type { Difficulty, PieceId } from "./game/types";

type TranslationRecords = Record<string, string | number>;
interface TranslationTree {
  [key: string]: string | TranslationTree;
}

const STORAGE_KEY: string = "quarto-lang";
const DEFAULT_LANG: string = "en";
const listeners: Set<() => void> = new Set<() => void>();
const RTL_LANGS: ReadonlySet<string> = new Set<string>([
  "ar",
  "arc",
  "ckb",
  "dv",
  "fa",
  "hbo",
  "he",
  "ks",
  "ps",
  "sam",
  "sd",
  "syc",
  "ug",
  "ur",
  "yi",
]);
const LANG_ALIASES: Readonly<Record<string, string>> = {
  in: "id",
  iw: "he",
};
const localeModules: Record<string, TranslationTree> = import.meta.glob<TranslationTree>(
  "./locales/*.json",
  { eager: true, import: "default" },
);

export const LOCALES: readonly string[] = Object.keys(localeModules)
  .map((path: string): string => path.replace(/^.*\/([^/]+)\.json$/, "$1"))
  .sort((left: string, right: string): number => left.localeCompare(right));
export type Locale = string;

const resources: Record<string, TranslationTree> = Object.fromEntries(
  LOCALES.map((lang: string): [string, TranslationTree] => {
    const resource: TranslationTree | undefined = localeModules[`./locales/${lang}.json`];
    if (resource === undefined) throw new Error(`Missing locale resource: ${lang}`);
    return [lang, resource];
  }),
);
const engResource: TranslationTree = (() => {
  const resource: TranslationTree | undefined = resources[DEFAULT_LANG];
  if (resource === undefined) throw new Error("Missing English locale resource");
  return resource;
})();
let localeGlobal: Locale = DEFAULT_LANG;
let isStorageListenerAttached: boolean = false;

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveStorage(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {}
}

function isSupportedLang(lang: string): boolean {
  return LOCALES.includes(lang);
}

function resolveLocale(value: string): Locale | undefined {
  const baseLang: string = value.toLowerCase().split("-")[0] ?? DEFAULT_LANG;
  if (isSupportedLang(baseLang)) return baseLang;
  const alias: string | undefined = LANG_ALIASES[baseLang];
  return alias !== undefined && isSupportedLang(alias) ? alias : undefined;
}

function detectLang(): Locale {
  const stored: string | null = readStorage();
  const storedLocale: Locale | undefined = stored === null ? undefined : resolveLocale(stored);
  if (storedLocale !== undefined) return storedLocale;
  for (const candidate of navigator.languages) {
    const resolved: Locale | undefined = resolveLocale(candidate);
    if (resolved !== undefined) return resolved;
  }
  return DEFAULT_LANG;
}

function lookupTransTree(tree: TranslationTree, key: string): string | undefined {
  let lang: string | TranslationTree = tree;
  for (const segment of key.split(".")) {
    if (typeof lang === "string") return undefined;
    const next: string | TranslationTree | undefined = lang[segment];
    if (next === undefined) return undefined;
    lang = next;
  }
  return typeof lang === "string" ? lang : undefined;
}

function applyTransAttr(attribute: "aria-label" | "title" | "content"): void {
  const dataAttr = `data-i18n-${attribute}`;
  for (const element of document.querySelectorAll<HTMLElement>(`[${dataAttr}]`)) {
    const key: string | null = element.getAttribute(dataAttr);
    if (key !== null) element.setAttribute(attribute, translate(key));
  }
}

function applyLang(): void {
  document.documentElement.lang = localeGlobal;
  document.documentElement.dir = RTL_LANGS.has(localeGlobal) ? "rtl" : "ltr";

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key: string | undefined = element.dataset.i18n;
    if (key !== undefined) element.textContent = translate(key);
  }

  applyTransAttr("aria-label");
  applyTransAttr("title");
  applyTransAttr("content");
}

function applyLocale(next: Locale, isPersist: boolean): void {
  if (next === localeGlobal) return;
  localeGlobal = next;
  if (isPersist) saveStorage(localeGlobal);
  applyLang();
  for (const listener of listeners) listener();
}

export async function initI18n(): Promise<void> {
  localeGlobal = detectLang();
  applyLang();

  if (!isStorageListenerAttached) {
    isStorageListenerAttached = true;
    window.addEventListener("storage", (event: StorageEvent): void => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      const resolved: Locale | undefined = resolveLocale(readStorage() ?? DEFAULT_LANG);
      if (resolved !== undefined) applyLocale(resolved, false);
    });
  }
}

export function translate(key: string, records: TranslationRecords = {}): string {
  const translation: string =
    lookupTransTree(resources[localeGlobal] ?? engResource, key) ??
    lookupTransTree(engResource, key) ??
    key;
  return translation.replace(/{{\s*([^}\s]+)\s*}}/g, (_: string, name: string): string =>
    String(records[name] ?? `{{${name}}}`),
  );
}

export function onLangChange(listener: () => void): void {
  listeners.add(listener);
}

export function diffLabel(diff: Difficulty): string {
  return translate(`diff.${String(diff).replace(/^difficulty\./, "")}`);
}

export function transTraits(piece: PieceId): string {
  const pieceTraits: PieceTraits = getPieceTraits(piece);
  return [
    translate(`piece.${pieceTraits.isDark ? "black" : "red"}`),
    translate(`piece.${pieceTraits.isBig ? "big" : "small"}`),
    translate(`piece.${pieceTraits.isRound ? "round" : "square"}`),
    translate(`piece.${pieceTraits.isSolid ? "solid" : "hollow"}`),
  ].join(", ");
}

export function changeLang(lang: string): void {
  const resolved: Locale | undefined = resolveLocale(lang);
  if (resolved === undefined) return;
  applyLocale(resolved, true);
}

export function curLang(): Locale {
  return localeGlobal;
}
