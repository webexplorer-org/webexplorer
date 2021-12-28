import { useState } from "react";
import { FilePicker } from "../Components/FilePicker";
import { FileViewer } from "../Components/FileViewer";
import { Page } from "../Components/Page";
import { PageContent } from "../Components/PageContent";
import { PageHeader } from "../Components/PageHeader";
import { PageTitle } from "../Components/PageTitle";

export interface HomePageProps {}

export function HomePage() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <Page>
      <PageHeader>
        <PageTitle title="WebReader"></PageTitle>
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
        <FileViewer file={file} />
      </PageContent>
    </Page>
  );
}
