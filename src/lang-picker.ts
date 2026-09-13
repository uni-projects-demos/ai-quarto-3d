import { changeLang, curLang, LOCALES, type Locale, onLangChange } from "./i18n";
import { fbLatinAlphLangs, fbNativeLangs } from "./lang-names";

interface LangOption {
  code: Locale;
  native: string;
  english: string;
}

function requiredElement<T extends Element>(id: string): T {
  const element: T | null = document.querySelector<T>(`#${id}`);
  if (element === null) throw new Error(`Missing required element #${id}`);
  return element;
}

function fbLangName(code: string, displayLocale: string): string {
  if (displayLocale === "en") return fbLatinAlphLangs[code] ?? fbNativeLangs[code] ?? code;
  return fbNativeLangs[code] ?? code;
}

function langName(code: string, displayLocale: string): string {
  const fallback: string = fbLangName(code, displayLocale);
  try {
    const displayed: string | undefined = new Intl.DisplayNames([displayLocale], {
      type: "language",
    }).of(code);
    return displayed !== undefined && displayed !== code ? displayed : fallback;
  } catch {
    return fallback;
  }
}

function normSearch(val: string): string {
  return val.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function initLangPicker(): void {
  const dialog: HTMLDialogElement = requiredElement<HTMLDialogElement>("language-dialog");
  const toggle: HTMLButtonElement = requiredElement<HTMLButtonElement>("language-toggle");
  const localeCode: HTMLElement = requiredElement<HTMLElement>("locale-code");
  const closeButton: HTMLButtonElement = requiredElement<HTMLButtonElement>("close-language");
  const search: HTMLInputElement = requiredElement<HTMLInputElement>("language-search");
  const options: HTMLElement = requiredElement<HTMLElement>("language-options");
  const empty: HTMLElement = requiredElement<HTMLElement>("language-empty");
  const collator: Intl.Collator = new Intl.Collator("en", { sensitivity: "base" });
  const langs: LangOption[] = LOCALES.map(
    (code: string): LangOption => ({
      code,
      native: fbNativeLangs[code] ?? langName(code, code),
      english: langName(code, "en"),
    }),
  ).sort(
    (left: LangOption, right: LangOption): number =>
      collator.compare(left.english, right.english) || left.code.localeCompare(right.code),
  );

  const updateToggle: () => void = (): void => {
    const locale: Locale = curLang();
    localeCode.textContent = locale.toUpperCase();
    localeCode.lang = locale;
    toggle.dataset.language = locale;
  };

  const renderLangs: () => void = (): void => {
    options.replaceChildren();
    const query: string = normSearch(search.value.trim());
    const current: Locale = curLang();

    for (const lang of langs) {
      if (!normSearch(`${lang.native} ${lang.english} ${lang.code}`).includes(query)) {
        continue;
      }

      const button: HTMLButtonElement = document.createElement("button");
      button.type = "button";
      button.className = "language-option";
      button.dataset.locale = lang.code;
      button.setAttribute("aria-pressed", String(lang.code === current));

      const name: HTMLSpanElement = document.createElement("span");
      name.textContent = lang.native;
      name.lang = lang.code;
      name.dir = "auto";

      const code: HTMLElement = document.createElement("small");
      code.textContent = lang.code.toUpperCase();
      code.dir = "ltr";

      button.append(name, code);
      button.addEventListener("click", (): void => {
        changeLang(lang.code);
        dialog.close();
      });
      options.append(button);
    }

    empty.hidden = options.childElementCount > 0;
  };

  toggle.addEventListener("click", (): void => {
    search.value = "";
    renderLangs();
    dialog.showModal();
    toggle.setAttribute("aria-expanded", "true");
    search.focus();
  });

  closeButton.addEventListener("click", (): void => dialog.close());
  dialog.addEventListener("close", (): void => {
    toggle.setAttribute("aria-expanded", "false");
    toggle.focus();
  });
  dialog.addEventListener("click", (event: MouseEvent): void => {
    if (event.target !== dialog) return;
    const bounds: DOMRect = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    ) {
      dialog.close();
    }
  });
  search.addEventListener("input", renderLangs);
  onLangChange((): void => {
    updateToggle();
    renderLangs();
  });

  updateToggle();
  renderLangs();
}
