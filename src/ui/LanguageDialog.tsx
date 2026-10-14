import type { JSX } from "react";

export function LanguageDialog(): JSX.Element {
  return (
    <dialog id="language-dialog" className="language-dialog" aria-labelledby="language-heading">
      <div className="language-heading">
        <h2 id="language-heading" data-i18n="language.label">
          Language
        </h2>
        <button
          id="close-language"
          className="dialog-close"
          type="button"
          aria-label="Close"
          data-i18n-aria-label="language.close"
        >
          ×
        </button>
      </div>
      <label
        className="language-search-label"
        htmlFor="language-search"
        data-i18n="language.search"
      >
        Search languages
      </label>
      <input
        id="language-search"
        className="language-search"
        type="search"
        autoComplete="off"
        spellCheck={false}
        aria-controls="language-options"
      />
      <div id="language-options" className="language-options" translate="no" />
      <p id="language-empty" className="language-empty" data-i18n="language.empty" hidden>
        No languages found
      </p>
    </dialog>
  );
}
