import { useEffect, useState } from "react";
import * as comlink from "comlink";
import "./ArchiveViewer.css";
import { ArchiveEntry, ArchiveWorker } from "../Worker/ArchiveWorker";

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
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);

  useEffect(() => {
    async function unarchive() {
      await worker.init();
      await worker.open(file, "");
      const entries = await worker.entries();
      setEntries(entries);
    }

    unarchive();

    return () => {
      worker.close();
    };
  }, [file, worker]);

  return (
    <div className="archive__viewer">
      <ol>
        {entries.map((entry, index) => {
          return (
            <li key={index}>
              <h4>{entry.name || entry.path}</h4>
              <p>{entry.size}B</p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default ArchiveViewer;
