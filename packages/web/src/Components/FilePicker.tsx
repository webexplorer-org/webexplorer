import { ComponentProps, useCallback, useState } from "react";
import "./FilePicker.css";

export interface FilePickerProps extends ComponentProps<"input"> {
  onFiles: (files: FileList) => void;
}

export function FilePicker(props: FilePickerProps) {
  const { onFiles } = props;

  const [id] = useState(() => {
    return `filepicker-${Date.now()}`;
  });

  const onChange = useCallback(
    (evt) => {
      onFiles(evt.target.files);
    },
    [onFiles]
  );

  return (
    <div className="filepicker">
      <input onChange={onChange} type="file" id={id} />
      <label htmlFor={id}>Choose File</label>
    </div>
  );
}
