import "./DropZone.css";

export interface DropZoneProps {
  onDropFile: (file: File) => void;
}

export function DropZone(props: DropZoneProps) {
  const { onDropFile } = props;

  return (
    <div className="dropzone">
      <ol>
        <li>
          <p>
            This website is a personal project. It's build for previewing files,
            especially when you get some files and you don't have any
            applications to open it. If you want more functionalities or better
            user experience, you should use specific application.
          </p>
          <p>
            Since it's not fully tested, it might have problems when opening
            some files, especially when the file is huge.
          </p>
          <p>
            In theory, it can be improved to support more functionalities,
            there's no plan or enough resources yet. If you find any problems,
            you can create an issue at &nbsp;
            <a
              target="_blank"
              href="https://github.com/exploreronweb/webexplorer/issues/new"
              rel="noreferrer"
            >
              GitHub
            </a>
            , there's no guarantee that it will be fixed immediately though.
          </p>
          <p>
            Once this website is fully loaded, it should be able to work offline
            if you don't reinstall your browser or clear your browser storage.
          </p>
        </li>
      </ol>

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
            <h4>Guitar Pro</h4>
            <p>.gp3 .gp4 .gp5</p>
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
