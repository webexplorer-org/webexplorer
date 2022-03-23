import "./ImageViewer.css";

export interface ImageViewerProps {
  file: File;
}

export function ImageViewer(props: ImageViewerProps) {
  const { file } = props;

  return (
    <div className="image__viewer">
      <img alt={file.name} src={URL.createObjectURL(file)} />
    </div>
  );
}

export default ImageViewer;
