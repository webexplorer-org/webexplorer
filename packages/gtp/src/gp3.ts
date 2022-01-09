import { GtpStream } from "./stream";
import { Song, TripletFeel, Version } from "./model";
import { GtpParser } from "./gp";

export class Gtp3Parser extends GtpParser {
  parse(stream: GtpStream, version: Version): Song {
    const info = this.parseInfo(stream);
    const tripletFeel = stream.readBool()
      ? TripletFeel.Eighth
      : TripletFeel.None;
    const tempo = stream.readInt32(true);
    const key: [number, number] = [stream.readInt32(true), 0];

    const channels = this.parseMidiChannels(stream);

    const measureCount = stream.readInt32(true);
    const trackCount = stream.readInt32(true);

    const { measureHeaders, repeatGroups } = this.parseMeasureHeaders(
      stream,
      measureCount,
      tripletFeel
    );
    const tracks = this.parseTracks(stream, trackCount, channels);
    this.parseMeasures(stream, measureHeaders, tracks);

    return {
      version,
      info,
      tempo,
      key,
      repeatGroups,
      measureHeaders,
      tracks,
      lyrics: { trackChoice: 0, lines: [] },
      masterEffect: {
        volume: 0,
        reverb: 0,
        equalizer: {
          knobs: [],
          gain: 0,
        },
      },
    };
  }
}
