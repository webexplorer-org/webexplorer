import { useEffect, useState } from "react";
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
        if (gtp) {
          console.log(gtp);
          setGtp(gtp);
        }
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
        <h4>{gtp.info.title}</h4>
        <p>{gtp.info.artist}</p>
        <p>{gtp.info.album}</p>
      </header>
      <div>
        <label htmlFor="track-select">Track: </label>
        <select
          id="track-select"
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
        <div className="tab">
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
                            {track.strings.map((string, stringIndex) => {
                              const note = beat.notes.find((note) => {
                                return note.string === string.index;
                              });

                              return (
                                <div
                                  className="guitar__string"
                                  key={stringIndex}
                                >
                                  <p className="note">{note?.value}</p>
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
    </div>
  );
}

export default GtpViewer;
