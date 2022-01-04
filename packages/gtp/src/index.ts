import { Stream, bytesToString } from "@webexplorer/common";

export enum TripletFeel {
  None,
  Eighth,
}

export class GtpStream extends Stream {
  readBool(): boolean {
    const byte = this.readInt8();
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
    const byte = this.readInt8();
    return this.readString(size, byte);
  }

  readIntSizeString() {
    const len = this.readInt32(true);
    return this.readString(len);
  }

  readIntByteSizeString() {
    const len = this.readInt32(true) - 1;
    return this.readByteSizeString(len);
  }
}

export const KeySignature = {
  FMajorFlat: [-8, 0],
  CMajorFlat: [-7, 0],
  GMajorFlat: [-6, 0],
  DMajorFlat: [-5, 0],
  AMajorFlat: [-4, 0],
  EMajorFlat: [-3, 0],
  BMajorFlat: [-2, 0],
  FMajor: [-1, 0],
  CMajor: [0, 0],
  GMajor: [1, 0],
  DMajor: [2, 0],
  AMajor: [3, 0],
  EMajor: [4, 0],
  BMajor: [5, 0],
  FMajorSharp: [6, 0],
  CMajorSharp: [7, 0],
  GMajorSharp: [8, 0],
  DMinorFlat: [-8, 1],
  AMinorFlat: [-7, 1],
  EMinorFlat: [-6, 1],
  BMinorFlat: [-5, 1],
  FMinor: [-4, 1],
  CMinor: [-3, 1],
  GMinor: [-2, 1],
  DMinor: [-1, 1],
  AMinor: [0, 1],
  EMinor: [1, 1],
  BMinor: [2, 1],
  FMinorSharp: [3, 1],
  CMinorSharp: [4, 1],
  GMinorSharp: [5, 1],
  DMinorSharp: [6, 1],
  AMinorSharp: [7, 1],
  EMinorSharp: [8, 1],
};

export type Gtp = {
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
  tracks: Track[];
};

export function parse(buffer: ArrayBuffer): Gtp {
  const stream = new GtpStream(buffer);

  const version = stream.readByteSizeString(30);

  const title = stream.readIntByteSizeString();
  const subtitle = stream.readIntByteSizeString();
  const artist = stream.readIntByteSizeString();
  const album = stream.readIntByteSizeString();
  const words = stream.readIntByteSizeString();
  const copyright = stream.readIntByteSizeString();
  const tab = stream.readIntByteSizeString();
  const instructions = stream.readIntByteSizeString();
  const noticesCount = stream.readInt32(true);
  const notices = [];
  for (let i = 0; i < noticesCount; i++) {
    const notice = stream.readIntByteSizeString();
    notices.push(notice);
  }

  const tripletFeel = stream.readBool() ? TripletFeel.Eighth : TripletFeel.None;
  const tempo = stream.readInt32(true);
  const key = stream.readInt32(true);

  const channels = parseMidiChannels(stream);

  const measureCount = stream.readInt32(true);
  const trackCount = stream.readInt32(true);

  const measureHeaders = parseMeasureHeaders(stream, measureCount);
  const tracks = parseTracks(stream, trackCount, channels);
  parseMeasures(stream, measureHeaders, tracks);

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
    tracks,
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

export const DEFAULT_PERCUSSION_CHANNEL = 9;

export function isPercussionChannel(channel: number) {
  return channel % 16 == DEFAULT_PERCUSSION_CHANNEL;
}

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
    const channel = i;
    const effectChannel = i;
    const isPercussionChannel = channel % 16 == DEFAULT_PERCUSSION_CHANNEL;
    const instrument = stream.readInt32(true);
    const volume = stream.readInt8();
    const balance = stream.readInt8();
    const chorus = stream.readInt8();
    const reverb = stream.readInt8();
    const phaser = stream.readInt8();
    const tremolo = stream.readInt8();

    stream.forward(2);

    channels.push({
      channel,
      effectChannel,
      instrument: isPercussionChannel && instrument === -1 ? 0 : instrument,
      volume,
      balance,
      chorus,
      reverb,
      phaser,
      tremolo,
    });
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
  startTime: number;
  flag: MeasureFlag;
  numerator: number;
  denominator: number;
  isRepeatBegin: boolean;
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
  for (let i = 1; i < measureCount + 1; i++) {
    const flag = stream.readInt8();

    let numerator: number | undefined;
    if (flag & MeasureFlag.KeyNumerator) {
      numerator = stream.readInt8();
    } else {
      numerator = previousHeader?.numerator;
    }
    if (numerator === undefined) {
      throw new Error("no numerator found");
    }

    let denominator: number | undefined;
    if (flag & MeasureFlag.KeyDenominator) {
      denominator = stream.readInt8();
    } else {
      denominator = previousHeader?.denominator;
    }
    if (denominator === undefined) {
      throw new Error("no denominator found");
    }

    const isRepeatBegin = !!(flag && MeasureFlag.RepeatBegin);
    const hasDoubleBar = !!(flag & MeasureFlag.PresenceDoubleBar);
    const measureHeader: MeasureHeader = {
      startTime: 0,
      flag,
      numerator,
      denominator,
      isRepeatBegin,
      hasDoubleBar,
    };

    if (flag & MeasureFlag.RepeatEnd) {
      measureHeader.repeatEnd = stream.readInt8();
    }

    if (flag & MeasureFlag.AlternateRepeatEnd) {
      const value = stream.readInt8();
      let alternateRepeatEnd = 0;
      for (const measureHeader of measureHeaders.reverse()) {
        if (measureHeader.isRepeatBegin) {
          break;
        }

        alternateRepeatEnd =
          measureHeader.alternateRepeatEnd! | alternateRepeatEnd;
      }
      measureHeader.alternateRepeatEnd =
        (1 << value) - (1 ^ alternateRepeatEnd);
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
      const root = stream.readInt8();
      const type = stream.readInt8();
      measureHeader.tonality = {
        root,
        type,
      };
    } else if (i > 1) {
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
  strings: { index: number; tuning: number }[];
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
    const flag = stream.readInt8();
    const name = stream.readByteSizeString(40);
    const count = stream.readInt32(true);
    const strings = [];
    for (let i = 0; i < 7; i++) {
      const tuning = stream.readInt32(true);
      if (i < count) {
        strings.push({
          index: i + 1,
          tuning,
        });
      }
    }
    const port = stream.readInt32(true);
    const channel = parseChannel(stream, channels);
    const fretCount = stream.readInt32(true);
    const offset = stream.readInt32(true);
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

export function parseChannel(stream: GtpStream, channels: MidiChannel[]) {
  const index = stream.readInt32(true) - 1;
  const effectChannel = stream.readInt32(true) - 1;
  if (index >= 0 && index < channels.length) {
    const channel = { ...channels[index] };
    if (channel.instrument < 0) {
      channel.instrument = 0;
    }
    if (!isPercussionChannel(channel.channel)) {
      channel.effectChannel = effectChannel;
    }
    return channel;
  }
}

export const QuarterTime = 960;

export type Measure = {
  startTime: number;
};

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
  let startTime = QuarterTime;
  for (const measureHeader of measureHeaders) {
    measureHeader.startTime = startTime;
    for (const track of tracks) {
      const beatCount = stream.readInt32();

      const beats: Beat[] = [];
      for (let i = 0; i < beatCount; i++) {
        const beat = parseBeat(stream, beats, startTime);
        beats.push(beat);
      }

      const measure = {
        startTime,
        beats,
      };

      track.measures.push(measure);
    }
    startTime = startTime + measureHeader.denominator;
  }
}

export type Beat = {};

/*
The first byte is the beat flags. It lists the data present in
the current beat:
- *0x01*: dotted notes
- *0x02*: presence of a chord diagram
- *0x04*: presence of a text
- *0x08*: presence of effects
- *0x10*: presence of a mix table change event
- *0x20*: the beat is a n-tuplet
- *0x40*: status: True if the beat is empty of if it is a rest
- *0x80*: *blank*
Flags are followed by:
- Status: :ref:`byte`. If flag at *0x40* is true, read one byte.
  If value of the byte is *0x00* then beat is empty, if value is
  *0x02* then the beat is rest.
- Beat duration: :ref:`byte`. See :meth:`readDuration`.
- Chord diagram. See :meth:`readChord`.
- Text: :ref:`int-byte-size-string`.
- Beat effects. See :meth:`readBeatEffects`.
- Mix table change effect. See :meth:`readMixTableChange`.
*/
export function parseBeat(stream: GtpStream, beats: Beat[], startTime: number) {
  const flags = stream.readInt8();

  return {};
}

export function parseColor(stream: GtpStream) {
  const color: [number, number, number] = [
    stream.readInt8(),
    stream.readInt8(),
    stream.readInt8(),
  ];
  return color;
}
