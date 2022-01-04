import { useEffect, useRef, useState } from "react";
import { Gtp, parse } from "@webexplorer/gtp";
import "./GtpViewer.css";

export type GtpViewerProps = {
  file: File;
};

export function GtpViewer(props: GtpViewerProps) {
  const { file } = props;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [Gtp, setGtp] = useState<Gtp | null>(null);

  useEffect(() => {
    async function render() {
      const reader = new FileReader();
      reader.onload = () => {
        const result = parse(reader.result as ArrayBuffer);
        console.log(result);
      };

      reader.readAsArrayBuffer(file);
    }

    render();
  }, [file, setGtp]);

  if (!Gtp) {
    return null;
  }

  return (
    <div className="gtp__viewer">
      <div ref={containerRef}></div>
    </div>
  );
}

export default GtpViewer;
