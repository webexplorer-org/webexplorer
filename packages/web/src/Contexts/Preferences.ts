import React from "react";
import { Locale } from "../Utils/Localization";

export interface Preferences {
  locale: Locale;
  locales: Locale[];
  updateLocale: (locale: Locale) => void;
}

export const PreferencesContext = React.createContext<Preferences>({
  locale: "en-US",
  locales: [],
  updateLocale: () => {
    throw new Error(
      "shouldn't use default updateLocale, it will ignore all the value"
    );
  },
});
