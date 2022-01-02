import "./EPubViewer.css";
import { useArchiveWorker } from "../Hooks/useArchiveWorker";
import { useUnarchive } from "../Hooks/useUnarchive";
import { useEffect, useState } from "react";
import { parse, EPub } from "@webexplorer/epub";

export type EPubViewerProps = {
  file: File;
};

export function EPubViewer(props: EPubViewerProps) {
  const { file } = props;
  const [epub, setEPub] = useState<EPub | null>(null);
  const [index, setIndex] = useState(0);
  const [doc, setDoc] = useState<string>("");

  const worker = useArchiveWorker();
  const [entries] = useUnarchive(worker, file, "", false);

  useEffect(() => {
    async function parseEpub() {
      if (entries.length > 0) {
        const epub = parse({ entries });
        setEPub(epub);
      }
    }

    parseEpub();
  }, [entries, setDoc]);

  useEffect(() => {
    if (!epub) {
      return;
    }

    const itemRef = epub.spine.itemRefs[index];
    const item = epub.manifest.items[itemRef.idRef];
    if (!item) {
      return;
    }

    const entry = entries.find((entry) => {
      return entry.path === epub.root + item.href;
    });
    if (entry) {
      const textDecoder = new TextDecoder("utf-8");

      const doc = textDecoder.decode(entry.data);
      setDoc(doc);
    }
  }, [epub, entries, index]);

  if (!epub) {
    return null;
  }

  return (
    <div className="epub__viewer">
      <div>
        <button
          type="button"
          disabled={index === 0}
          onClick={() => {
            setIndex(() => {
              return index - 1;
            });
          }}
        >
          Prev
        </button>
        <button
          onClick={() => {
            setIndex(() => {
              return index + 1;
            });
          }}
          disabled={index === epub?.spine?.itemRefs?.length - 1}
        >
          Next
        </button>
      </div>
      <div>
        <iframe title={epub.metadata.title} srcDoc={doc} />
      </div>
    </div>
  );
}

export default EPubViewer;
