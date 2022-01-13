import "./App.css";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./Pages/HomePage";
import { ReactLocalization, LocalizationProvider } from "@fluent/react";
import { useState, useEffect, useCallback } from "react";
import {
  createReactLocalization,
  localizations,
  Locale,
  locales,
} from "./Utils/Localization";
import { negotiateLanguages } from "@fluent/langneg";
import Cookie from "js-cookie";
import { PreferencesContext } from "./Contexts/Preferences";

const localeCookieName = "Locale";

function App() {
  const [locale, setLocale] = useState(() => {
    const locale = Cookie.get(localeCookieName) as Locale;
    if (locale) {
      return locale;
    } else {
      const locales = negotiateLanguages(
        navigator.languages,
        Object.keys(localizations),
        { defaultLocale: "en-US" }
      ) as Locale[];
      return locales[0];
    }
  });

  const [l10n, setL10n] = useState<ReactLocalization>(() => {
    return createReactLocalization(locale);
  });

  useEffect(() => {
    const localization = createReactLocalization(locale);
    setL10n(localization);
  }, [locale, setL10n]);

  const updateLocale = useCallback(
    (locale: Locale) => {
      Cookie.set(localeCookieName, locale);
      setLocale(locale);
    },
    [setLocale]
  );

  return (
    <PreferencesContext.Provider value={{ locale, locales, updateLocale }}>
      <LocalizationProvider l10n={l10n}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />}></Route>
          </Routes>
        </BrowserRouter>
      </LocalizationProvider>
    </PreferencesContext.Provider>
  );
}

export default App;
