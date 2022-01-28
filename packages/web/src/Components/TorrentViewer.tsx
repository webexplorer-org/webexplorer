import { useEffect, useState, useCallback, useRef } from "react";
import "./TorrentViewer.css";
import { State, Stateful } from "./Stateful";
import WebTorrent, { Torrent, TorrentFile } from "webtorrent/webtorrent.min";
import { Buffer } from "buffer";
import { Localized } from "@fluent/react";

export interface TorrentViewerProps {
  file: File;
}

export function TorrentViewer(props: TorrentViewerProps) {
  const { file } = props;
  const [torrent, setTorrent] = useState<Torrent | null>(null);
  const [state, setState] = useState(State.Initial);
  const [client] = useState(() => {
    return new WebTorrent();
  });

  useEffect(() => {
    function load() {
      setState(State.Loading);

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as ArrayBuffer;

        const buffer = Buffer.from(result);

        client.add(buffer, (torrent: Torrent) => {
          setTorrent(torrent);
          setState(State.Success);
        });

        client.on("error", (err) => {
          setState(State.Failure);
        });
      };

      reader.onerror = (err) => {
        setState(State.Failure);
      };

      reader.readAsArrayBuffer(file);
    }

    load();
  }, [client, file, setTorrent]);

  return (
    <Stateful state={state}>
      <div className="torrent__viewer">
        {torrent?.files.map((file, index) => {
          return <TorrentFileItem file={file} key={index}></TorrentFileItem>;
        })}
      </div>
    </Stateful>
  );
}

export function TorrentFileItem({ file }: { file: TorrentFile }) {
  const previewerElemRef = useRef<HTMLDivElement>(null);

  const preview = useCallback(() => {
    if (previewerElemRef.current) {
      file.appendTo(previewerElemRef.current);
    }
  }, [file]);

  const [url, setUrl] = useState("");

  useEffect(() => {
    file.getBlobURL((err, url) => {
      if (url) {
        setUrl(url);
      }
    });
  }, [file, setUrl]);

  return (
    <div className="torrent__file">
      <header>
        <p>{file.name}</p>
        <Localized id="preview">
          <button onClick={preview} type="button">
            Preview
          </button>
        </Localized>
        <Localized id="download">
          <a rel="noreferrer" target="_blank" href={url}>
            Download
          </a>
        </Localized>
      </header>
      <div className="previewer" ref={previewerElemRef}></div>
    </div>
  );
}

export default TorrentViewer;
