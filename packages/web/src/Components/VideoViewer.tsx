import "./VideoViewer.css";

export interface VideoViewerProps {
  file: File;
}

export function VideoViewer(props: VideoViewerProps) {
  const { file } = props;

  return (
    <div className="video__viewer">
      <video controls src={URL.createObjectURL(file)} />
    </div>
  );
}

export default VideoViewer;
