import "./ArchiveViewer.css";
import { useArchiveWorker } from "../Hooks/useArchiveWorker";
import { useUnarchive } from "../Hooks/useUnarchive";

export interface ArchiveViewerProps {
  file: File;
}

export function ArchiveViewer(props: ArchiveViewerProps) {
  const { file } = props;

  const worker = useArchiveWorker();
  const [entries] = useUnarchive(worker, file, "");

  return (
    <div className="archive__viewer">
      <ol>
        {entries.map((entry, index) => {
          return (
            <li key={index}>
              <div>
                <h4>{entry.name}</h4>
                <p>{entry.path}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default ArchiveViewer;
