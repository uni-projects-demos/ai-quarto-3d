import type { DOMAttributes } from "react";
import type { TranslationKey } from "../i18n/types";

declare module "react" {
  interface HTMLAttributes<T> extends DOMAttributes<T> {
    "data-i18n"?: TranslationKey;
    "data-i18n-aria-label"?: TranslationKey;
    "data-i18n-title"?: TranslationKey;
    "data-i18n-content"?: TranslationKey;
  }

  interface CSSProperties {
    [key: `--${string}`]: string | number | undefined;
  }
}
