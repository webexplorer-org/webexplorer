import "./MsgViewer.css";
import { useEffect, useState } from "react";

export type MsgViewerProps = {
  file: File;
};

export function MsgViewer(props: MsgViewerProps) {
  const { file } = props;
  const [doc, setDoc] = useState<string>("");

  useEffect(() => {
    async function parseMsg() {
      const reader = new FileReader();
      reader.onload = () => {
        setDoc(reader.result as string);
      };
      reader.readAsText(file);
    }

    parseMsg();
  }, [setDoc]);

  if (!doc) {
    return null;
  }

  return (
    <div className="epub__viewer">
      <div>
        <iframe title={file.name} srcDoc={doc} />
      </div>
    </div>
  );
}

export default MsgViewer;
