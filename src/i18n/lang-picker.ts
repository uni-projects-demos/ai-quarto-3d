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

function fbLangName(code: string, dispLocale: string): string {
  if (dispLocale === "en") return fbLatinAlphLangs[code] ?? fbNativeLangs[code] ?? code;
  return fbNativeLangs[code] ?? code;
}

function langName(code: string, dispLocale: string): string {
  const fb: string = fbLangName(code, dispLocale);
  try {
    const displayed: string | undefined = new Intl.DisplayNames([dispLocale], {
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
  const evts = { signal: cleanup.signal };
  let req = 0;
  const dialog: HTMLDialogElement = requiredEl("language-dialog", HTMLDialogElement);
  const toggles = [...document.querySelectorAll<HTMLButtonElement>("[data-language-toggle]")];
  const localeCodes = [...document.querySelectorAll<HTMLElement>("[data-locale-code]")];
  let activeToggle: HTMLButtonElement | undefined = toggles[0];
  const closeButton: HTMLButtonElement = requiredEl("close-language", HTMLButtonElement);
  const search: HTMLInputElement = requiredEl("language-search", HTMLInputElement);
  const opts: HTMLElement = requiredEl("language-options", HTMLElement);
  const empty: HTMLElement = requiredEl("language-empty", HTMLElement);
  const coll: Intl.Collator = new Intl.Collator("en", { sensitivity: "base" });
  const langs: LangOption[] = LOCALES.map((code: string): LangOption => {
    const native = fbNativeLangs[code] ?? langName(code, code);
    const english = langName(code, "en");
    return { code, native, english, search: normSearch(`${native} ${english} ${code}`) };
  }).sort(
    (left: LangOption, right: LangOption): number =>
      coll.compare(left.english, right.english) || left.code.localeCompare(right.code),
  );

  const updateToggle: () => void = (): void => {
    const locale: Locale = curLang();
    for (const code of localeCodes) {
      code.textContent = locale.toUpperCase();
      code.lang = locale;
    }
    for (const toggle of toggles) toggle.dataset.language = locale;
  };

  const btns = new Map<Locale, HTMLButtonElement>();
  for (const lang of langs) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "language-option";
    btn.dataset.locale = lang.code;
    const nm = document.createElement("span");
    nm.textContent = lang.native;
    nm.lang = lang.code;
    nm.dir = "auto";
    const code = document.createElement("small");
    code.textContent = lang.code.toUpperCase();
    code.dir = "ltr";
    btn.append(nm, code);
    btns.set(lang.code, btn);
  }

  const renderLangs = (): void => {
    const query = normSearch(search.value.trim());
    const cur = curLang();
    const fragment = document.createDocumentFragment();
    for (const lang of langs) {
      const btn = btns.get(lang.code);
      if (!btn || !lang.search.includes(query)) continue;
      btn.setAttribute("aria-pressed", String(lang.code === cur));
      fragment.append(btn);
    }
    opts.replaceChildren(fragment);
    empty.hidden = opts.childElementCount > 0;
  };

  opts.addEventListener(
    "click",
    (evt: MouseEvent): void => {
      if (!(evt.target instanceof Element)) return;
      const btn = evt.target.closest<HTMLButtonElement>("button[data-locale]");
      const code = btn?.dataset.locale;
      if (!code || !opts.contains(btn)) return;
      const reqId: number = ++req;
      void changeLang(code)
        .then((): void => {
          if (reqId === req) dialog.close();
        })
        .catch(console.error);
    },
    evts,
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
      evts,
    );
  }

  closeButton.addEventListener("click", (): void => dialog.close(), evts);
  dialog.addEventListener(
    "close",
    (): void => {
      for (const toggle of toggles) toggle.setAttribute("aria-expanded", "false");
      activeToggle?.focus();
    },
    evts,
  );
  dialog.addEventListener(
    "click",
    (evt: MouseEvent): void => {
      if (evt.target !== dialog) return;
      const bounds: DOMRect = dialog.getBoundingClientRect();
      if (
        evt.clientX < bounds.left ||
        evt.clientX > bounds.right ||
        evt.clientY < bounds.top ||
        evt.clientY > bounds.bottom
      ) {
        dialog.close();
      }
    },
    evts,
  );
  search.addEventListener("input", renderLangs, evts);
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
