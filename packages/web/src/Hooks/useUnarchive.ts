import { useState, useEffect } from "react";
import * as comlink from "comlink";
import { ArchiveWorker } from "../Worker/ArchiveWorker";
import { ArchiveEntry } from "@webexplorer/archive";

export function useUnarchive(
  worker: comlink.Remote<ArchiveWorker>,
  file: File,
  passphrase: string,
  skipExtraction: boolean = true
) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);

  useEffect(() => {
    async function unarchive() {
      await worker.init();
      await worker.open(file, passphrase);
      const entries = await worker.entries(skipExtraction);
      setEntries(entries);
    }

    unarchive();
  }, [worker, file, passphrase, skipExtraction]);

  return [entries];
}
