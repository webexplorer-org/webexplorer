import { useEffect, useRef, useState } from "react";
import { Song, parse } from "@webexplorer/gtp";
import "./GtpViewer.css";

export type GtpViewerProps = {
  file: File;
};

export function GtpViewer(props: GtpViewerProps) {
  const { file } = props;
  const [gtp, setGtp] = useState<Song | null>(null);
  const [trackIndex, setTrackIndex] = useState(0);

  useEffect(() => {
    async function render() {
      const reader = new FileReader();
      reader.onload = () => {
        const gtp = parse(reader.result as ArrayBuffer);
        console.log(gtp);
        setGtp(gtp);
      };

      reader.readAsArrayBuffer(file);
    }

    render();
  }, [file, setGtp]);

  if (!gtp) {
    return null;
  }

  const track = gtp.tracks[trackIndex];

  return (
    <div className="gtp__viewer">
      <header>
        <h4>{gtp.title}</h4>
        <p>{gtp.artist}</p>
        <p>{gtp.album}</p>
      </header>
      <div>
        <select
          value={trackIndex}
          onChange={(evt) => {
            setTrackIndex(parseInt(evt.target.value, 10));
          }}
        >
          {gtp.tracks.map((track, index) => {
            return (
              <option key={index} value={index}>
                {track.name}
              </option>
            );
          })}
        </select>
        {gtp.measureHeaders.map((measureHeader, measureIndex) => {
          const measure = track.measures[measureIndex];
          return (
            <div className="measure" key={measureIndex}>
              {measure.voices.map((voice, voiceIndex) => {
                return (
                  <div key={voiceIndex} className="voice">
                    {voice.beats.map((beat, beatIndex) => {
                      return (
                        <div className="beat" key={beatIndex}>
                          {beat.notes.map((note, noteIndex) => {
                            return (
                              <div className="note" key={noteIndex}>
                                <p>{JSON.stringify(note)}</p>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default GtpViewer;
