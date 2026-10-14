import type engResource from "./locales/en.json";

type LeafKeys<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${LeafKeys<T[K]>}`;
}[keyof T & string];

export type TranslationKey = LeafKeys<typeof engResource>;
export type TranslationRecords = Readonly<Record<string, string | number>>;

export interface TranslationTree {
  readonly [key: string]: string | TranslationTree;
}
