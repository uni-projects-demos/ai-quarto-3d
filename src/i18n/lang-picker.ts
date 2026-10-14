import { Cleanup, type Dispose } from "../shared/Cleanup";
import { requiredEl } from "../shared/dom";
import { changeLang, curLang, LOCALES, type Locale, onLangChange } from "./i18n";
import { fbLatinAlphLangs, fbNativeLangs } from "./lang-names";

interface LangOption {
  code: Locale;
  native: string;
  english: string;
  search: string;
}

function fbLangName(code: string, displayLocale: string): string {
  if (displayLocale === "en") return fbLatinAlphLangs[code] ?? fbNativeLangs[code] ?? code;
  return fbNativeLangs[code] ?? code;
}

function langName(code: string, displayLocale: string): string {
  const fb: string = fbLangName(code, displayLocale);
  try {
    const displayed: string | undefined = new Intl.DisplayNames([displayLocale], {
      type: "language",
    }).of(code);
    return displayed !== undefined && displayed !== code ? displayed : fb;
  } catch {
    return fb;
  }
}

function normSearch(val: string): string {
  return val.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function initLangPicker(): Dispose {
  const cleanup = new Cleanup();
  const events = { signal: cleanup.signal };
  let req = 0;
  const dialog: HTMLDialogElement = requiredEl("language-dialog", HTMLDialogElement);
  const toggles = [...document.querySelectorAll<HTMLButtonElement>("[data-language-toggle]")];
  const localeCodes = [...document.querySelectorAll<HTMLElement>("[data-locale-code]")];
  let activeToggle: HTMLButtonElement | undefined = toggles[0];
  const closeButton: HTMLButtonElement = requiredEl("close-language", HTMLButtonElement);
  const search: HTMLInputElement = requiredEl("language-search", HTMLInputElement);
  const options: HTMLElement = requiredEl("language-options", HTMLElement);
  const empty: HTMLElement = requiredEl("language-empty", HTMLElement);
  const collator: Intl.Collator = new Intl.Collator("en", { sensitivity: "base" });
  const langs: LangOption[] = LOCALES.map((code: string): LangOption => {
    const native = fbNativeLangs[code] ?? langName(code, code);
    const english = langName(code, "en");
    return { code, native, english, search: normSearch(`${native} ${english} ${code}`) };
  }).sort(
    (left: LangOption, right: LangOption): number =>
      collator.compare(left.english, right.english) || left.code.localeCompare(right.code),
  );

  const updateToggle: () => void = (): void => {
    const locale: Locale = curLang();
    for (const code of localeCodes) {
      code.textContent = locale.toUpperCase();
      code.lang = locale;
    }
    for (const toggle of toggles) toggle.dataset.language = locale;
  };

  const buttons = new Map<Locale, HTMLButtonElement>();
  for (const lang of langs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "language-option";
    button.dataset.locale = lang.code;
    const name = document.createElement("span");
    name.textContent = lang.native;
    name.lang = lang.code;
    name.dir = "auto";
    const code = document.createElement("small");
    code.textContent = lang.code.toUpperCase();
    code.dir = "ltr";
    button.append(name, code);
    buttons.set(lang.code, button);
  }

  const renderLangs = (): void => {
    const query = normSearch(search.value.trim());
    const cur = curLang();
    const fragment = document.createDocumentFragment();
    for (const lang of langs) {
      const button = buttons.get(lang.code);
      if (!button || !lang.search.includes(query)) continue;
      button.setAttribute("aria-pressed", String(lang.code === cur));
      fragment.append(button);
    }
    options.replaceChildren(fragment);
    empty.hidden = options.childElementCount > 0;
  };

  options.addEventListener(
    "click",
    (event: MouseEvent): void => {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest<HTMLButtonElement>("button[data-locale]");
      const code = button?.dataset.locale;
      if (!code || !options.contains(button)) return;
      const request = ++req;
      void changeLang(code)
        .then((): void => {
          if (request === req) dialog.close();
        })
        .catch(console.error);
    },
    events,
  );

  for (const toggle of toggles) {
    toggle.addEventListener(
      "click",
      (): void => {
        activeToggle = toggle;
        search.value = "";
        renderLangs();
        dialog.showModal();
        toggle.setAttribute("aria-expanded", "true");
        search.focus();
      },
      events,
    );
  }

  closeButton.addEventListener("click", (): void => dialog.close(), events);
  dialog.addEventListener(
    "close",
    (): void => {
      for (const toggle of toggles) toggle.setAttribute("aria-expanded", "false");
      activeToggle?.focus();
    },
    events,
  );
  dialog.addEventListener(
    "click",
    (event: MouseEvent): void => {
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
    },
    events,
  );
  search.addEventListener("input", renderLangs, events);
  cleanup.add(
    onLangChange((): void => {
      updateToggle();
      renderLangs();
    }),
  );

  updateToggle();
  renderLangs();
  return (): void => {
    req += 1;
    cleanup.dispose();
    if (dialog.open) dialog.close();
  };
}
