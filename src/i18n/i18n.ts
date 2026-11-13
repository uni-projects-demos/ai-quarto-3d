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
const localeMods: Record<string, () => Promise<unknown>> = import.meta.glob<unknown>(
  ["./locales/*.json", "!./locales/en.json"],
  {
    import: "default",
  },
);
const resMap = new Map<Locale, TranslationTree>([[DEFAULT_LANG, engResource]]);
const loading = new Map<Locale, Promise<TranslationTree>>();
const keys = new Set<string>();
function collectKeys(tree: TranslationTree, pre = ""): void {
  for (const [key, val] of Object.entries(tree)) {
    const pth: string = pre ? `${pre}.${key}` : key;
    if (typeof val === "string") keys.add(pth);
    else collectKeys(val, pth);
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
    Object.values(val).every(
      (nxt: unknown): nxt is string | TranslationTree =>
        typeof nxt === "string" || isTranslationTree(nxt),
    )
  );
}

async function loadLocale(lang: Locale): Promise<TranslationTree> {
  const cache: TranslationTree | undefined = resMap.get(lang);
  if (cache) return cache;
  const pend: Promise<TranslationTree> | undefined = loading.get(lang);
  if (pend) return pend;
  const load: (() => Promise<unknown>) | undefined = localeMods[`./locales/${lang}.json`];
  if (!load) throw new Error(`Missing locale resource: ${lang}`);
  const prom: Promise<TranslationTree> = load()
    .then((res: unknown): TranslationTree => {
      if (!isTranslationTree(res)) throw new Error(`Invalid locale resource: ${lang}`);
      resMap.set(lang, res);
      return res;
    })
    .finally((): void => {
      loading.delete(lang);
    });
  loading.set(lang, prom);
  return prom;
}

export const LOCALES: readonly string[] = [
  DEFAULT_LANG,
  ...Object.keys(localeMods).map((pth: string): string => pth.replace(/^.*\/([^/]+)\.json$/, "$1")),
].sort((left: string, right: string): number => left.localeCompare(right));
export type Locale = string;

let curLocale: Locale = DEFAULT_LANG;
let localeReq: number = 0;
let isStorageListenerAttached: boolean = false;
let initCount: number = 0;

function isSupportedLang(lang: string): boolean {
  return LOCALES.includes(lang);
}

function resolveLocale(val: string): Locale | undefined {
  const base: string = val.toLowerCase().split("-")[0] ?? DEFAULT_LANG;
  if (isSupportedLang(base)) return base;
  const alias: string | undefined = LANG_ALIASES[base];
  return alias !== undefined && isSupportedLang(alias) ? alias : undefined;
}

function detectLang(): Locale {
  const stored: string | null = readStorage(STORAGE_KEY);
  const storedLang: Locale | undefined = stored === null ? undefined : resolveLocale(stored);
  if (storedLang !== undefined) return storedLang;
  for (const cand of navigator.languages) {
    const resolved: Locale | undefined = resolveLocale(cand);
    if (resolved !== undefined) return resolved;
  }
  return DEFAULT_LANG;
}

function lookupTransTree(tree: TranslationTree, key: string): string | undefined {
  let lang: string | TranslationTree = tree;
  for (const seg of key.split(".")) {
    if (typeof lang === "string") return undefined;
    const nxt: string | TranslationTree | undefined = lang[seg];
    if (nxt === undefined) return undefined;
    lang = nxt;
  }
  return typeof lang === "string" ? lang : undefined;
}

function applyTransAttr(attr: "aria-label" | "title" | "content"): void {
  const dataAttr = `data-i18n-${attr}`;
  for (const el of document.querySelectorAll<HTMLElement>(`[${dataAttr}]`)) {
    const key: string | null = el.getAttribute(dataAttr);
    if (key !== null && isTranslationKey(key)) el.setAttribute(attr, translate(key));
  }
}

function applyLang(): void {
  document.documentElement.lang = curLocale;
  document.documentElement.dir = RTL_LANGS.has(curLocale) ? "rtl" : "ltr";

  for (const el of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key: string | undefined = el.dataset.i18n;
    if (key !== undefined && isTranslationKey(key)) el.textContent = translate(key);
  }

  applyTransAttr("aria-label");
  applyTransAttr("title");
  applyTransAttr("content");
}

async function applyLocale(nxt: Locale, isPersist: boolean): Promise<void> {
  const req: number = ++localeReq;
  await loadLocale(nxt);
  if (req !== localeReq) return;
  if (isPersist) saveStorage(STORAGE_KEY, nxt);
  if (nxt === curLocale) return;
  curLocale = nxt;
  applyLang();
  for (const listener of listeners) listener();
}

const onStorage: (evt: StorageEvent) => void = (evt: StorageEvent): void => {
  if (evt.key !== STORAGE_KEY && evt.key !== null) return;
  const resolved: string | undefined = resolveLocale(readStorage(STORAGE_KEY) ?? DEFAULT_LANG);
  if (resolved !== undefined) void applyLocale(resolved, false).catch(console.error);
};

export async function initI18n(): Promise<Dispose> {
  const req: number = localeReq + 1;
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
  let isDisposed: boolean = false;
  return (): void => {
    if (isDisposed) return;
    isDisposed = true;
    initCount -= 1;
    if (initCount > 0) return;
    isStorageListenerAttached = false;
    window.removeEventListener("storage", onStorage);
  };
}

export function translate(key: TranslationKey, records: TranslationRecords = {}): string {
  const trans: string =
    lookupTransTree(resMap.get(curLocale) ?? engResource, key) ??
    lookupTransTree(engResource, key) ??
    key;
  return trans.replace(/{{\s*([^}\s]+)\s*}}/g, (_: string, nm: string): string =>
    String(records[nm] ?? `{{${nm}}}`),
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

export function transTraits(pc: PieceId, thm: ThemeId = DEFAULT_THEME): string {
  const pcTraits: PieceTraits = getPresentedPieceTraits(pc);
  const cols = themeColKeys(thm);
  return [
    translate(pcTraits.isDark ? cols.dark : cols.light),
    translate(`piece.${pcTraits.isBig ? "big" : "small"}`),
    translate(`piece.${pcTraits.isRound ? "round" : "square"}`),
    translate(`piece.${pcTraits.isSolid ? "solid" : "hollow"}`),
  ].join(", ");
}

export async function changeLang(lang: string): Promise<void> {
  const resolved: Locale | undefined = resolveLocale(lang);
  if (resolved === undefined) return;
  await applyLocale(resolved, true);
}

export function curLang(): Locale {
  return curLocale;
}
