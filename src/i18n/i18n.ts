import type { PieceTraits } from "../game/pieces";
import type { Difficulty, PieceId } from "../game/types";
import { getPresentedPieceTraits } from "../render/piecePresentation";
import type { Dispose } from "../shared/Cleanup";
import { readStorage, saveStorage } from "../shared/storage";
import { DEFAULT_THEME, type ThemeId, themeColKeys } from "../themes";
import engResource from "./locales/en.json";
import type { TranslationKey, TranslationRecords, TranslationTree } from "./types";

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
const localeModules = import.meta.glob<unknown>(["./locales/*.json", "!./locales/en.json"], {
  import: "default",
});
const resources = new Map<Locale, TranslationTree>([[DEFAULT_LANG, engResource]]);
const loading = new Map<Locale, Promise<TranslationTree>>();
const keys = new Set<string>();
function collectKeys(tree: TranslationTree, prefix = ""): void {
  for (const [key, val] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") keys.add(path);
    else collectKeys(val, path);
  }
}
collectKeys(engResource);

export function isTranslationKey(val: string): val is TranslationKey {
  return keys.has(val);
}

function isTranslationTree(val: unknown): val is TranslationTree {
  return (
    typeof val === "object" &&
    val !== null &&
    !Array.isArray(val) &&
    Object.values(val).every((nxt: unknown) => typeof nxt === "string" || isTranslationTree(nxt))
  );
}

async function loadLocale(lang: Locale): Promise<TranslationTree> {
  const cached = resources.get(lang);
  if (cached) return cached;
  const pending = loading.get(lang);
  if (pending) return pending;
  const load = localeModules[`./locales/${lang}.json`];
  if (!load) throw new Error(`Missing locale resource: ${lang}`);
  const promise = load()
    .then((resource: unknown): TranslationTree => {
      if (!isTranslationTree(resource)) throw new Error(`Invalid locale resource: ${lang}`);
      resources.set(lang, resource);
      return resource;
    })
    .finally((): void => {
      loading.delete(lang);
    });
  loading.set(lang, promise);
  return promise;
}

export const LOCALES: readonly string[] = [
  DEFAULT_LANG,
  ...Object.keys(localeModules).map((path: string): string =>
    path.replace(/^.*\/([^/]+)\.json$/, "$1"),
  ),
].sort((left: string, right: string): number => left.localeCompare(right));
export type Locale = string;

let localeGlobal: Locale = DEFAULT_LANG;
let localeReq = 0;
let isStorageListenerAttached = false;
let initCount = 0;

function isSupportedLang(lang: string): boolean {
  return LOCALES.includes(lang);
}

function resolveLocale(val: string): Locale | undefined {
  const baseLang: string = val.toLowerCase().split("-")[0] ?? DEFAULT_LANG;
  if (isSupportedLang(baseLang)) return baseLang;
  const alias: string | undefined = LANG_ALIASES[baseLang];
  return alias !== undefined && isSupportedLang(alias) ? alias : undefined;
}

function detectLang(): Locale {
  const stored: string | null = readStorage(STORAGE_KEY);
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
    const nxt: string | TranslationTree | undefined = lang[segment];
    if (nxt === undefined) return undefined;
    lang = nxt;
  }
  return typeof lang === "string" ? lang : undefined;
}

function applyTransAttr(attribute: "aria-label" | "title" | "content"): void {
  const dataAttr = `data-i18n-${attribute}`;
  for (const element of document.querySelectorAll<HTMLElement>(`[${dataAttr}]`)) {
    const key: string | null = element.getAttribute(dataAttr);
    if (key !== null && isTranslationKey(key)) element.setAttribute(attribute, translate(key));
  }
}

function applyLang(): void {
  document.documentElement.lang = localeGlobal;
  document.documentElement.dir = RTL_LANGS.has(localeGlobal) ? "rtl" : "ltr";

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key: string | undefined = element.dataset.i18n;
    if (key !== undefined && isTranslationKey(key)) element.textContent = translate(key);
  }

  applyTransAttr("aria-label");
  applyTransAttr("title");
  applyTransAttr("content");
}

async function applyLocale(nxt: Locale, isPersist: boolean): Promise<void> {
  const req = ++localeReq;
  await loadLocale(nxt);
  if (req !== localeReq) return;
  if (isPersist) saveStorage(STORAGE_KEY, nxt);
  if (nxt === localeGlobal) return;
  localeGlobal = nxt;
  applyLang();
  for (const listener of listeners) listener();
}

const onStorage = (event: StorageEvent): void => {
  if (event.key !== STORAGE_KEY && event.key !== null) return;
  const resolved = resolveLocale(readStorage(STORAGE_KEY) ?? DEFAULT_LANG);
  if (resolved !== undefined) void applyLocale(resolved, false).catch(console.error);
};

export async function initI18n(): Promise<Dispose> {
  const req = localeReq + 1;
  try {
    await applyLocale(detectLang(), false);
  } catch {
    if (req === localeReq) await applyLocale(DEFAULT_LANG, false);
  }
  applyLang();
  initCount += 1;
  if (!isStorageListenerAttached) {
    isStorageListenerAttached = true;
    window.addEventListener("storage", onStorage);
  }
  let disposed = false;
  return (): void => {
    if (disposed) return;
    disposed = true;
    initCount -= 1;
    if (initCount > 0) return;
    isStorageListenerAttached = false;
    window.removeEventListener("storage", onStorage);
  };
}

export function translate(key: TranslationKey, records: TranslationRecords = {}): string {
  const translation: string =
    lookupTransTree(resources.get(localeGlobal) ?? engResource, key) ??
    lookupTransTree(engResource, key) ??
    key;
  return translation.replace(/{{\s*([^}\s]+)\s*}}/g, (_: string, name: string): string =>
    String(records[name] ?? `{{${name}}}`),
  );
}

export function onLangChange(listener: () => void): Dispose {
  listeners.add(listener);
  return (): void => {
    listeners.delete(listener);
  };
}

export function diffLabel(diff: Difficulty): string {
  return translate(`diff.${diff}`);
}

export function transTraits(piece: PieceId, theme: ThemeId = DEFAULT_THEME): string {
  const pieceTraits: PieceTraits = getPresentedPieceTraits(piece);
  const colours = themeColKeys(theme);
  return [
    translate(pieceTraits.isDark ? colours.dark : colours.light),
    translate(`piece.${pieceTraits.isBig ? "big" : "small"}`),
    translate(`piece.${pieceTraits.isRound ? "round" : "square"}`),
    translate(`piece.${pieceTraits.isSolid ? "solid" : "hollow"}`),
  ].join(", ");
}

export async function changeLang(lang: string): Promise<void> {
  const resolved: Locale | undefined = resolveLocale(lang);
  if (resolved === undefined) return;
  await applyLocale(resolved, true);
}

export function curLang(): Locale {
  return localeGlobal;
}
