import "./MobiViewer.css";

export type MobiViewerProps = {
  file: File;
};

export function MobiViewer(props: MobiViewerProps) {
  return <div className="mobi__viewer"></div>;
}

export default MobiViewer;
