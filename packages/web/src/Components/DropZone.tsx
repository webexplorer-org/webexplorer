import "./DropZone.css";
import { Localized } from "@fluent/react";

export interface DropZoneProps {
  onDropFile: (file: File) => void;
}

export function DropZone(props: DropZoneProps) {
  const { onDropFile } = props;

  return (
    <div className="dropzone">
      <ol>
        <li>
          <Localized id="project-privacy-statement">
            <p>
              This website is a personal project. It's build for previewing
              files, especially when you get some files and you don't have any
              applications to open it. Do note that it won't upload or save any
              of any of your files to any places, don't use this as cloud
              storage.
            </p>
          </Localized>
          <Localized id="offline-support-statement">
            <p>
              Once this website is fully loaded, it should be able to work
              offline if you don't reinstall your browser or clear your browser
              storage.
            </p>
          </Localized>
          <p>
            <Localized id="support-and-feedback-statement">
              Since it's not fully tested, it might have problems when opening
              some files, especially when the file is huge. If you find any
              problems, you can create an issue at Github, there's no guarantee
              that it will be fixed immediately though.
            </Localized>
          </p>
          <p>
            <a
              target="_blank"
              href="https://github.com/exploreronweb/webexplorer/issues"
              rel="noreferrer"
            >
              GitHub
            </a>
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
        <Localized id="drag-and-drop-file-here">
          <p>Drag and drop file here</p>
        </Localized>
      </div>
      <div>
        <Localized id="supported-files">
          <h3>Supported Files</h3>
        </Localized>
        <table>
          <thead>
            <tr>
              <th>
                <Localized id="file">File</Localized>
              </th>
              <th>
                <Localized id="extension">Extension</Localized>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <Localized id="pdf-file">PDF File</Localized>
              </td>
              <td>.pdf</td>
            </tr>
            <tr>
              <td>
                <Localized id="epub-file">EPUB File</Localized>
              </td>
              <td>.epub</td>
            </tr>
            <tr>
              <td>
                <Localized id="mobi-file">Mobi File</Localized>
              </td>
              <td>.mobi</td>
            </tr>
            <tr>
              <td>
                <Localized id="azw3-file">Azw3 File</Localized>
              </td>
              <td>.azw3 (limited supported)</td>
            </tr>
            <tr>
              <td>
                <Localized id="archive-file">Archive File</Localized>
              </td>
              <td>.zip .rar .tar.gz</td>
            </tr>
            <tr>
              <td>
                <Localized id="guitar-tab-file">Guitar Tab File</Localized>
              </td>
              <td>.gp3 .gp4</td>
            </tr>
            <tr>
              <td>
                <Localized id="threed-model-file">3D Model File</Localized>
              </td>
              <td>.gltf .stl .3mf .obj</td>
            </tr>
            <tr>
              <td>
                <Localized id="torrent-file">Torrent File</Localized>
              </td>
              <td>.torrent</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
