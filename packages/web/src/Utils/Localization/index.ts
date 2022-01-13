import enUS from "./en-US.ftl";
import zhCN from "./zh-CN.ftl";
import { ReactLocalization } from "@fluent/react";
import { FluentBundle, FluentResource } from "@fluent/bundle";

export interface Localization {
  locale: "en-US" | "zh-CN";
  content: string;
}

export type Locale = Localization["locale"];

export const localizations: Localization[] = [
  {
    locale: "en-US",
    content: enUS,
  },
  {
    locale: "zh-CN",
    content: zhCN,
  },
];

export const locales: Locale[] = ["en-US", "zh-CN"];

export function createReactLocalization(locale: Locale) {
  const localization: Localization =
    localizations.find((localization) => localization.locale === locale) ||
    localizations[0];

  const resource = new FluentResource(localization.content);
  const bundle = new FluentBundle(localization.locale);
  bundle.addResource(resource);

  return new ReactLocalization([bundle]);
}
