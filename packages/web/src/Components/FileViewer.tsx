import * as mime from "mime";
import React, { Suspense } from "react";
import "./FileViewer.css";
import { Loading } from "./Loading";

const PdfViewer = React.lazy(() => import("./PdfViewer"));
const ArchiveViewer = React.lazy(() => import("./ArchiveViewer"));
const ThreeViewer = React.lazy(() => import("./ThreeViewer"));

export interface FileViewerProps {
  file: File | null;
}

export function FileViewer(props: FileViewerProps) {
  const { file } = props;

  if (!file) {
    return null;
  }

  // @ts-ignore
  const fileType = file.type || mime.getType(file.name);

  let viewer = null;
  switch (fileType) {
    case "application/pdf":
      viewer = <PdfViewer file={file} />;
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
    default:
      viewer = (
        <div>
          Unsupported File: {file.name} {fileType}
        </div>
      );
  }

  return (
    <div className="file__viewer">
      <Suspense fallback={<Loading />}>{viewer}</Suspense>
    </div>
  );
}
