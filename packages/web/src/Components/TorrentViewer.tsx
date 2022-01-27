import { useEffect, useState } from "react";
import "./TorrentViewer.css";
import { State, Stateful } from "./Stateful";
import WebTorrent from "webtorrent/webtorrent.min";
import { Buffer } from "buffer";

export interface TorrentViewerProps {
  file: File;
}

export function TorrentViewer(props: TorrentViewerProps) {
  const { file } = props;
  const [torrent, setTorrent] = useState<any>(null);
  const [files, setFiles] = useState<Array<{ name: string; url: string }>>([]);
  const [state, setState] = useState(State.Initial);
  const [client] = useState(() => {
    return new WebTorrent();
  });

  useEffect(() => {
    function load() {
      setState(State.Initial);
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as ArrayBuffer;
        const buffer = Buffer.from(result);

        client.add(buffer, (torrent: any) => {
          torrent.files.forEach((file: any) => {
            file.getBlobURL((err: Error, url: string) => {
              setFiles((files) => {
                return [...files, { name: file.name, url }];
              });
            });
          });
          setTorrent(torrent);
          setState(State.Success);
        });
      };

      reader.onerror = () => {
        setState(State.Failure);
      };

      reader.readAsArrayBuffer(file);
    }

    load();
  }, [client, file, setFiles, setTorrent]);

  return (
    <Stateful state={state}>
      <div className="torrent__viewer">
        <p>
          <span>Magnet Link: </span>
          <span>{torrent?.magnetURI}</span>
        </p>
        <ol>
          {files.map((file, index) => {
            return (
              <li key={index}>
                <a href={file.url}>{file.name}</a>
              </li>
            );
          })}
        </ol>
      </div>
    </Stateful>
  );
}

export default TorrentViewer;
