import type { JSX } from "react";

export function LanguageToggle({ id, codeId }: { id: string; codeId: string }): JSX.Element {
  return (
    <button
      id={id}
      className="utility-button language-toggle"
      type="button"
      aria-label="Language"
      title="Language"
      data-i18n-title="language.label"
      data-i18n-aria-label="language.label"
      aria-haspopup="dialog"
      aria-expanded="false"
      aria-controls="language-dialog"
      data-language-toggle
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3c2.5 2.5 3.8 5.5 3.8 9S14.5 18.5 12 21" />
        <path d="M12 3c-2.5 2.5-3.8 5.5-3.8 9s1.3 6.5 3.8 9" />
      </svg>
      <span id={codeId} className="locale-code" dir="ltr" translate="no" data-locale-code>
        EN
      </span>
    </button>
  );
}
