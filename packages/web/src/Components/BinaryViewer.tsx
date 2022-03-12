import { useEffect, useState } from "react";
import "./BinaryViewer.css";

export interface BinaryViewerProps {
  file: File;
}

export function BinaryViewer(props: BinaryViewerProps) {
  const { file } = props;
  const [bytes, setBytes] = useState<number[]>([]);

  useEffect(() => {
    function init() {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = reader.result as ArrayBuffer;
        const view = new DataView(buffer);
        const length = view.byteLength;
        const bytes: number[] = [];
        for (let j = 0; j < length; j++) {
          const byte = view.getInt8(j);
          bytes.push(byte);
        }

        setBytes(bytes);
      };

      reader.readAsArrayBuffer(file);
    }

    init();
  }, [file, setBytes]);

  return (
    <div className="binary__viewer">
      {bytes.map((byte, index) => {
        return (
          <div key={index}>
            <span>0x{byte.toString(16).toUpperCase()}</span>
          </div>
        );
      })}
    </div>
  );
}
