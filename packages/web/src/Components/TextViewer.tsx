import { useEffect, useState } from "react";
import "./TextViewer.css";

export interface TextViewerProps {
  file: File;
}

export function TextViewer(props: TextViewerProps) {
  const { file } = props;
  const [text, setText] = useState("");

  useEffect(() => {
    function init() {
      const reader = new FileReader();
      reader.onload = () => {
        setText(reader.result as string);
      };

      reader.readAsText(file);
    }

    init();
  }, [file]);

  return (
    <div className="text__viewer">
      <p>{text}</p>
    </div>
  );
}
