import "./DropZone.css";

export interface DropZoneProps {
  onDropFile: (file: File) => void;
}

export function DropZone(props: DropZoneProps) {
  const { onDropFile } = props;

  return (
    <div className="dropzone">
      <div
        className="dropzone__area"
        onDragStart={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }}
        onDragOver={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }}
        onDragEnd={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }}
        onDrop={(evt) => {
          evt.preventDefault();

          for (let i = 0; i < evt.dataTransfer.items.length; i++) {
            // If dropped items aren't files, reject them
            if (evt.dataTransfer.items[i].kind === "file") {
              const file = evt.dataTransfer.items[i].getAsFile();
              if (file) {
                onDropFile(file);
                break;
              }
            }
          }
        }}
      >
        <p>Drag and drop file here</p>
      </div>
      <div>
        <h3>Support File Types</h3>
        <div className="file__list">
          <div className="file__list__item">
            <h4>PDF File</h4>
            <p>.pdf</p>
          </div>
          <div className="file__list__item">
            <h4>EPUB File</h4>
            <p>.epub</p>
          </div>
          <div className="file__list__item">
            <h4>Mobi File</h4>
            <p>.mobi</p>
          </div>
          <div className="file__list__item">
            <h4>Archive File</h4>
            <p>.zip .rar .tar.gz</p>
          </div>
          <div className="file__list__item">
            <h4>3D Model</h4>
            <p>.gltf .stl .3mf .obj</p>
          </div>
        </div>
      </div>
    </div>
  );
}
