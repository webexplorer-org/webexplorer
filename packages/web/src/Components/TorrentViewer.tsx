import { useEffect, useState, useCallback, useRef } from "react";
import "./TorrentViewer.css";
import { State, Stateful } from "./Stateful";
import { decode } from "@webexplorer/torrent";
import WebTorrent, { Torrent } from "webtorrent/webtorrent.min";
import { Buffer } from "buffer";
import { Stream } from "@webexplorer/common";
import { Localized } from "@fluent/react";

export interface TorrentViewerProps {
  file: File;
}

export function TorrentViewer(props: TorrentViewerProps) {
  const { file } = props;
  const [torrent, setTorrent] = useState<any>(null);
  const [result, setResult] = useState<ArrayBuffer | null>(null);
  const [state, setState] = useState(State.Initial);

  useEffect(() => {
    function load() {
      setState(State.Loading);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as ArrayBuffer;
        const stream = new Stream(result);
        const torrent = decode(stream);
        setTorrent(torrent);
        setResult(result);
        setState(State.Success);
      };

      reader.onerror = () => {
        setState(State.Failure);
      };

      reader.readAsArrayBuffer(file);
    }

    load();
  }, [file, setResult, setTorrent]);

  const filesElemRef = useRef<HTMLDivElement>(null);
  const [client] = useState(() => {
    return new WebTorrent();
  });
  const download = useCallback(() => {
    if (!result) {
      return;
    }

    const buffer = Buffer.from(result);

    client.add(buffer, (torrent: Torrent) => {
      torrent.files.forEach((file) => {
        if (filesElemRef.current) {
          file.appendTo(filesElemRef.current);
        }
      });
    });

    client.on("error", (err) => {
      console.log(err);
    });
  }, [client, result]);

  return (
    <Stateful state={state}>
      <div className="torrent__viewer">
        <p className="info">
          <span>{torrent?.info.name}</span>
        </p>
        <Localized
          id="include-n-files"
          vars={{ count: torrent?.info.files.length }}
        >
          <p className="info">
            <span>Include {torrent?.info.files.length} files</span>
          </p>
        </Localized>
        <div className="files" ref={filesElemRef}></div>
        <Localized id="download-files">
          <button onClick={download}>Download</button>
        </Localized>
      </div>
    </Stateful>
  );
}

export default TorrentViewer;
