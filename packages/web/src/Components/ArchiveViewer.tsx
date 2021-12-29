import { useEffect, useRef, useState } from "react";
import * as comlink from "comlink";
import "./ArchiveViewer.css";
import type { ArchiveWorker } from "../Worker/ArchiveWorker";

export interface ArchiveViewerProps {
  file: File;
}

export function ArchiveViewer(props: ArchiveViewerProps) {
  const { file } = props;

  const [worker] = useState(() => {
    const worker = new Worker(
      new URL("../Worker/ArchiveWorker.ts", import.meta.url)
    );
    return comlink.wrap<ArchiveWorker>(worker);
  });

  useEffect(() => {
    async function unarchive() {
      await worker.init();
      const version = await worker.open(file);

      console.log(version);
    }

    unarchive();
  }, [file, worker]);

  return <div className="archive__viewer"></div>;
}

export default ArchiveViewer;
