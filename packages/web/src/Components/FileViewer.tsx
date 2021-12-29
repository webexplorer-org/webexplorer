import React, { Suspense } from "react";
import { Mime } from "../Utils/Mime";
import "./FileViewer.css";
import { Loading } from "./Loading";

const PdfViewer = React.lazy(() => import("./PdfViewer"));
const ArchiveViewer = React.lazy(() => import("./ArchiveViewer"));

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
    case Mime.ZIP:
      viewer = <ArchiveViewer file={file} />;
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
