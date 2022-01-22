import { useEffect, useRef, useState } from "react";
import { Mobi, parse } from "@webexplorer/mobi";
import "./MobiViewer.css";
import { isOk } from "@webexplorer/common";

export type MobiViewerProps = {
  file: File;
};

export function MobiViewer(props: MobiViewerProps) {
  const { file } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mobi, setMobi] = useState<Mobi | null>(null);

  useEffect(() => {
    async function render() {
      const reader = new FileReader();
      reader.onload = () => {
        const result = parse(reader.result as ArrayBuffer);
        console.log(result);
        if (isOk(result)) {
          setMobi(result.value);
          if (containerRef.current) {
            const container = containerRef.current;
            const parser = new DOMParser();
            const doc = parser.parseFromString(result.value.text, "text/html");
            doc.body.childNodes.forEach((node) => {
              if (node instanceof Element) {
                container.appendChild(node);
              }
            });
          }
        }
      };

      reader.readAsArrayBuffer(file);
    }

    render();
  }, [file, setMobi]);

  if (!mobi) {
    return null;
  }

  return (
    <div className="mobi__viewer">
      <div ref={containerRef}></div>
    </div>
  );
}

export default MobiViewer;
