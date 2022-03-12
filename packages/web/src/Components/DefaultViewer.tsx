import { Localized } from "@fluent/react";
import { ReactNode, useState } from "react";
import { BinaryViewer } from "./BinaryViewer";
import "./DefaultViewer.css";
import { TextViewer } from "./TextViewer";

export interface DefaultViewerProps {
  file: File;
}

export type FallbackViewer = "BinaryViewer" | "TextViewer";

export function DefaultViewer(props: DefaultViewerProps) {
  const { file } = props;
  const [fallbackViewer, setFallbackViewer] =
    useState<FallbackViewer>("TextViewer");

  let viewer: ReactNode | null = null;
  switch (fallbackViewer) {
    case "BinaryViewer":
      viewer = <BinaryViewer file={file} />;
      break;
    case "TextViewer":
      viewer = <TextViewer file={file} />;
      break;
  }

  return (
    <div className="default__viewer">
      <header className="default__viewer__header">
        <h4>
          <Localized id="default-viewer">Default Viewer</Localized>
        </h4>
        <select
          value={fallbackViewer}
          onChange={(evt) => {
            setFallbackViewer(evt.target.value as FallbackViewer);
          }}
        >
          <Localized id="text">
            <option value="TextViewer">Text</option>
          </Localized>
          <Localized id="binary">
            <option value="BinaryViewer">Binary</option>
          </Localized>
        </select>
      </header>
      <section>{viewer}</section>
    </div>
  );
}

export default DefaultViewer;
