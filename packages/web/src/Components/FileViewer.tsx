import React, { Suspense } from "react";
import { mimeType } from "../Utils/file";
import "./FileViewer.css";
import GtpViewer from "./GtpViewer";
import { Loading } from "./Loading";
import { useDocumentTitle } from "./DocumentTitle";

const PdfViewer = React.lazy(() => import("./PdfViewer"));
const ArchiveViewer = React.lazy(() => import("./ArchiveViewer"));
const ThreeViewer = React.lazy(() => import("./ThreeViewer"));
const EPubViewer = React.lazy(() => import("./EPubViewer"));
const MobiViewer = React.lazy(() => import("./MobiViewer"));

export interface FileViewerProps {
  file: File;
}

export function FileViewer(props: FileViewerProps) {
  const { file } = props;
  let viewer = null;

  const fileType = mimeType(file);
  switch (fileType) {
    case "application/pdf":
      viewer = <PdfViewer file={file} />;
      break;
    case "application/epub+zip":
      viewer = <EPubViewer file={file} />;
      break;
    case "application/x-azw3":
    case "application/x-mobipocket-ebook":
      viewer = <MobiViewer file={file} />;
      break;
    case "application/zip":
    case "application/vnd.rar":
    case "application/x-zip-compressed":
    case "application/x-gzip":
      viewer = <ArchiveViewer file={file} />;
      break;
    case "model/stl":
      viewer = <ThreeViewer file={file} format="stl" />;
      break;
    case "model/gltf-binary":
    case "model/gltf+json":
      viewer = <ThreeViewer file={file} format="gltf" />;
      break;
    case "model/obj":
      viewer = <ThreeViewer file={file} format="obj" />;
      break;
    case "model/3mf":
      viewer = <ThreeViewer file={file} format="3mf" />;
      break;
    case "application/x-gtp":
      viewer = <GtpViewer file={file} />;
      break;
    default:
      viewer = (
        <div>
          Unsupported File: {file.name} {fileType}
        </div>
      );
  }

  useDocumentTitle({ title: file.name });

  return (
    <div className="file__viewer">
      <Suspense fallback={<Loading />}>{viewer}</Suspense>
    </div>
  );
}
