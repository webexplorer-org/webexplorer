import { BufferBuilder, Stream, bytesToString } from "@webexplorer/common";

export enum TripletFeel {
  None,
  Eighth,
}

export class GtpStream extends Stream {
  readBool(): boolean {
    const byte = this.readUint8();
    return !!(byte & 0xff);
  }

  readString(size: number, length?: number) {
    if (length === undefined) {
      length = size;
    }

    const count = size > 0 ? size : length;
    return bytesToString(this.readBytes(count).slice(0, length));
  }

  readByteSizeString(size: number) {
    const byte = this.readUint8();
    return this.readString(size, byte);
  }

  readIntSizeString() {
    const len = this.readUint32(true);
    return this.readString(len);
  }

  readIntByteSizeString() {
    const len = this.readUint32(true) - 1;
    return this.readByteSizeString(len);
  }
}

export type Gtp = {
  info: GtpInfo;
};

export type GtpInfo = {
  version: string;
  title: string;
  subtitle: string;
  artist: string;
  album: string;
  words: string;
  copyright: string;
  tab: string;
  instructions: string;
  notices: string[];
  tripletFeel: TripletFeel;
  tempo: number;
  key: number;
  channels: MidiChannel[];
  measureHeaders: MeasureHeader[];
  tracks: [];
  measures: Measure[];
};

export function parse(buffer: ArrayBuffer): Gtp {
  const stream = new GtpStream(buffer);
  const info = parseInfo(stream);

  return {
    info,
  };
}

export function parseInfo(stream: GtpStream): GtpInfo {
  const version = stream.readByteSizeString(30);
  const title = stream.readIntByteSizeString();
  const subtitle = stream.readIntByteSizeString();
  const artist = stream.readIntByteSizeString();
  const album = stream.readIntByteSizeString();
  const words = stream.readIntByteSizeString();
  const copyright = stream.readIntByteSizeString();
  const tab = stream.readIntByteSizeString();
  const instructions = stream.readIntByteSizeString();

  const noticesCount = stream.readUint32(true);
  const notices = [];
  for (let i = 0; i < noticesCount; i++) {
    const notice = stream.readIntByteSizeString();
    notices.push(notice);
  }

  const tripletFeel = stream.readBool() ? TripletFeel.Eighth : TripletFeel.None;
  const tempo = stream.readUint32(true);
  const key = stream.readUint32(true);

  const channels = parseMidiChannels(stream);

  const measureCount = stream.readUint32(true);
  const trackCount = stream.readUint32(true);

  const measureHeaders = parseMeasureHeaders(stream, measureCount);
  const tracks = parserTracks(stream, trackCount, channels);
  const measures = parseMeasures(stream);

  return {
    version,
    title,
    subtitle,
    artist,
    album,
    words,
    copyright,
    tab,
    instructions,
    notices,
    tripletFeel,
    tempo,
    key,
    channels,
    measureHeaders,
    trackCount,
  };
}

export type MidiChannel = {
  channel: number;
  effectChannel: number;
  instrument: number;
  volume: number;
  balance: number;
  chorus: number;
  reverb: number;
  phaser: number;
  tremolo: number;
};

/*
  stream Guitar Pro format provides 64 channels (4 MIDI ports by 16 channels), the channels are stored in this order:
  - port1/channel1
  - port1/channel2
  - ...
  - port1/channel16
  - port2/channel1
  - ...
  - port4/channel16
  Each channel has the following form:
  - Instrument: :ref:`int`.
  - Volume: :ref:`byte`.
  - Balance: :ref:`byte`.
  - Chorus: :ref:`byte`.
  - Reverb: :ref:`byte`.
  - Phaser: :ref:`byte`.
  - Tremolo: :ref:`byte`.
  - blank1: :ref:`byte`.
  - blank2: :ref:`byte`.
 */
export function parseMidiChannels(stream: GtpStream) {
  const channels = [];
  for (let i = 0; i < 64; i++) {
    const instrument = stream.readUint32(true);
    const volume = stream.readUint8();
    const balance = stream.readUint8();
    const chorus = stream.readUint8();
    const reverb = stream.readUint8();
    const phaser = stream.readUint8();
    const tremolo = stream.readUint8();

    stream.forward(2);

    const channel = {
      channel: i,
      effectChannel: i,
      instrument,
      volume,
      balance,
      chorus,
      reverb,
      phaser,
      tremolo,
    };

    channels.push(channel);
  }

  return channels;
}

export enum MeasureFlag {
  KeyNumerator = 0x01,
  KeyDenominator = 0x02,
  RepeatBegin = 0x04,
  RepeatEnd = 0x08,
  AlternateRepeatEnd = 0x10,
  PresenceMarker = 0x20,
  Tonality = 0x40,
  PresenceDoubleBar = 0x80,
}

export type MeasureHeader = {
  flag: MeasureFlag;
  numerator: number;
  denominator: number;
  isRepeatOpen: boolean;
  repeatEnd?: number;
  alternateRepeatEnd?: number;
  marker?: {
    title: string;
    color: [number, number, number];
  };
  tonality?: {
    root?: number;
    type?: number;
  };
  hasDoubleBar: boolean;
};

export function parseMeasureHeaders(stream: GtpStream, measureCount: number) {
  const measureHeaders: MeasureHeader[] = [];
  let previousHeader: MeasureHeader | null = null;
  for (let i = 1; i <= measureCount; i++) {
    const flag = stream.readUint8();
    let numerator: number | undefined;
    if (flag & MeasureFlag.KeyNumerator) {
      numerator = stream.readUint8();
    } else {
      numerator = previousHeader?.numerator;
    }
    if (!numerator) {
      throw new Error(`no numerator for channel ${i}`);
    }

    let denominator: number | undefined;
    if (flag & MeasureFlag.KeyDenominator) {
      denominator = stream.readUint8();
    } else {
      denominator = previousHeader?.denominator;
    }
    if (!denominator) {
      throw new Error(`no denominator for channel ${i}`);
    }

    const measureHeader: MeasureHeader = {
      flag,
      numerator,
      denominator,
      isRepeatOpen: !!(flag & MeasureFlag.RepeatBegin),
      hasDoubleBar: !!(flag & MeasureFlag.PresenceDoubleBar),
    };

    if (flag & MeasureFlag.RepeatEnd) {
      measureHeader.repeatEnd = stream.readUint8();
    }

    if (flag & MeasureFlag.AlternateRepeatEnd) {
      const value = stream.readUint8();
      let alternateRepeatEnd = 0;
      for (const measureHeader of measureHeaders) {
        if (measureHeader.isRepeatOpen) {
          break;
        }

        alternateRepeatEnd =
          measureHeader.alternateRepeatEnd! | alternateRepeatEnd;
      }
      measureHeader.alternateRepeatEnd =
        ((1 << value) - 1) ^ alternateRepeatEnd;
    }

    if (flag & MeasureFlag.PresenceMarker) {
      const title = stream.readIntByteSizeString();
      const color = parseColor(stream);
      measureHeader.marker = {
        title,
        color,
      };
    }

    if (flag & MeasureFlag.Tonality) {
      const root = stream.readUint8();
      const type = stream.readUint8();
      measureHeader.tonality = {
        root,
        type,
      };
    } else if (measureHeaders.length > 1) {
      measureHeader.tonality = previousHeader?.tonality;
    }

    measureHeaders.push(measureHeader);

    previousHeader = measureHeader;
  }

  return measureHeaders;
}

export enum TrackFlag {
  Drum = 0x01,
  Guitar = 0x02,
  Banjo = 0x04,
}

export type Track = {
  flag: TrackFlag;
  name: string;
  strings: { tuning: number }[];
  port: number;
  channel: MidiChannel | undefined;
  fretCount: number;
  offset: number;
  color: [number, number, number];
  measures: Measure[];
};

/*
The first byte is the track's flags. It presides the track's attributes:
- *0x01*: drums track
- *0x02*: 12 stringed guitar track
- *0x04*: banjo track
- *0x08*: *blank*
- *0x10*: *blank*
- *0x20*: *blank*
- *0x40*: *blank*
- *0x80*: *blank*
Flags are followed by:
- Name: :ref:`byte-size-string`. A 40 characters long string
  containing the track's name.
- Number of strings: :ref:`int`. An integer equal to the number
    of strings of the track.
- Tuning of the strings: List of 7 :ref:`Ints <int>`. The tuning
  of the strings is stored as a 7-integers table, the "Number of
  strings" first integers being really used. The strings are
  stored from the highest to the lowest.
- Port: :ref:`int`. The number of the MIDI port used.
- Channel. See :meth:`GP3File.readChannel`.
- Number of frets: :ref:`int`. The number of frets of the
  instrument.
- Height of the capo: :ref:`int`. The number of the fret on
  which a capo is set. If no capo is used, the value is 0.
- Track's color. The track's displayed color in Guitar Pro.
*/
export function parseTracks(
  stream: GtpStream,
  trackCount: number,
  channels: MidiChannel[]
) {
  const tracks: Track[] = [];

  for (let i = 0; i < trackCount; i++) {
    const flag = stream.readUint8();
    const name = stream.readByteSizeString(40);
    const count = stream.readUint32();
    const strings = [];
    for (let i = 0; i < 7; i++) {
      const tuning = stream.readUint32();
      if (i < count) {
        strings.push({
          tuning,
        });
      }
    }
    const port = stream.readUint32();
    const channel = parseChannel(stream, channels);
    const fretCount = stream.readUint32();
    const offset = stream.readUint32();
    const color = parseColor(stream);

    tracks.push({
      flag,
      name,
      strings,
      port,
      channel,
      fretCount,
      offset,
      color,
      measures: [],
    });
  }

  return tracks;
}

export type Measure = {};

/*
Measures are written in the following order:
- measure 1/track 1
- measure 1/track 2
- ...
- measure 1/track m
- measure 2/track 1
- measure 2/track 2
- ...
- measure 2/track m
- ...
- measure n/track 1
- measure n/track 2
- ...
- measure n/track m
*/
export function parseMeasures(
  stream: GtpStream,
  measureHeaders: MeasureHeader[],
  tracks: Track[]
) {
  const measures: Measure = [];

  for (const measureHeader of measureHeaders) {
    for (const track of tracks) {
      const measure = {};

      track.measures.push(measure);
    }
  }

  return measures;
}

export function parseChannel(stream: GtpStream, channels: MidiChannel[]) {
  const index = stream.readUint32();
  const effectChannel = stream.readUint32();
  if (index >= 0 && index < channels.length) {
    const channel = { ...channels[index] };
    if (channel.instrument < 0) {
      channel.instrument = 0;
    }
    channel.effectChannel = effectChannel;
    return channel;
  }
}

export function parseColor(stream: GtpStream) {
  const color: [number, number, number] = [
    stream.readUint8(),
    stream.readUint8(),
    stream.readUint8(),
  ];
  return color;
}
