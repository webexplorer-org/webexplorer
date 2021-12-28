import { Suspense } from "react";
import { Mime } from "../Mime";
import "./FileViewer.css";
import { Loading } from "./Loading";
import { PdfViewer } from "./PdfViewer";

export interface FileViewerProps {
  file: File | null;
}

export function FileViewer(props: FileViewerProps) {
  const { file } = props;

  if (!file) {
    return null;
  }

  let viewer = null;
  switch (file.type) {
    case Mime.PDF:
      viewer = <PdfViewer file={file} />;
      break;
    default:
      viewer = <div>Unsupported File</div>;
  }

  return (
    <div className="file__viewer">
      <Suspense fallback={<Loading />}>{viewer}</Suspense>
    </div>
  );
}
