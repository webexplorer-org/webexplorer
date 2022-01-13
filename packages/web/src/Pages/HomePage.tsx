import { useState, useContext } from "react";
import { FilePicker } from "../Components/FilePicker";
import { FileViewer } from "../Components/FileViewer";
import { DropZone } from "../Components/DropZone";
import { Page } from "../Components/Page";
import { PageContent } from "../Components/PageContent";
import { PageHeader } from "../Components/PageHeader";
import { PageTitle } from "../Components/PageTitle";
import { PreferencesContext } from "../Contexts/Preferences";
import { Locale } from "../Utils/Localization";
import "./HomePage.css";
import { useLocalization } from "@fluent/react";

export interface HomePageProps {}

export function HomePage(props: HomePageProps) {
  const [file, setFile] = useState<File | null>(null);
  const { locale, locales, updateLocale } = useContext(PreferencesContext);
  const { l10n } = useLocalization();

  return (
    <Page className="page--home">
      <PageHeader>
        <PageTitle title="Web Explorer"></PageTitle>
        <select
          className="locale"
          value={locale}
          onChange={(evt) => {
            updateLocale(evt.target.value as Locale);
          }}
        >
          {locales.map((locale) => {
            return (
              <option key={locale} value={locale}>
                {l10n.getString(locale)}
              </option>
            );
          })}
        </select>
        <FilePicker
          accept="*/pdf"
          onFiles={(files) => {
            if (files.length > 0) {
              setFile(files[0]);
            }
          }}
        />
      </PageHeader>
      <PageContent>
        {file ? <FileViewer file={file} /> : <DropZone onDropFile={setFile} />}
      </PageContent>
    </Page>
  );
}
