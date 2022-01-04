"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseColor = exports.parseBeat = exports.parseMeasures = exports.QuarterTime = exports.parseChannel = exports.parseTracks = exports.TrackFlag = exports.parseMeasureHeaders = exports.MeasureFlag = exports.parseMidiChannels = exports.isPercussionChannel = exports.DEFAULT_PERCUSSION_CHANNEL = exports.parse = exports.KeySignature = exports.GtpStream = exports.TripletFeel = void 0;
const common_1 = require("@webexplorer/common");
var TripletFeel;
(function (TripletFeel) {
    TripletFeel[TripletFeel["None"] = 0] = "None";
    TripletFeel[TripletFeel["Eighth"] = 1] = "Eighth";
})(TripletFeel = exports.TripletFeel || (exports.TripletFeel = {}));
class GtpStream extends common_1.Stream {
    readBool() {
        const byte = this.readInt8();
        return !!(byte & 0xff);
    }
    readString(size, length) {
        if (length === undefined) {
            length = size;
        }
        const count = size > 0 ? size : length;
        return (0, common_1.bytesToString)(this.readBytes(count).slice(0, length));
    }
    readByteSizeString(size) {
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
exports.GtpStream = GtpStream;
exports.KeySignature = {
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
function parse(buffer) {
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
exports.parse = parse;
exports.DEFAULT_PERCUSSION_CHANNEL = 9;
function isPercussionChannel(channel) {
    return channel % 16 == exports.DEFAULT_PERCUSSION_CHANNEL;
}
exports.isPercussionChannel = isPercussionChannel;
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
function parseMidiChannels(stream) {
    const channels = [];
    for (let i = 0; i < 64; i++) {
        const channel = i;
        const effectChannel = i;
        const isPercussionChannel = channel % 16 == exports.DEFAULT_PERCUSSION_CHANNEL;
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
exports.parseMidiChannels = parseMidiChannels;
var MeasureFlag;
(function (MeasureFlag) {
    MeasureFlag[MeasureFlag["KeyNumerator"] = 1] = "KeyNumerator";
    MeasureFlag[MeasureFlag["KeyDenominator"] = 2] = "KeyDenominator";
    MeasureFlag[MeasureFlag["RepeatBegin"] = 4] = "RepeatBegin";
    MeasureFlag[MeasureFlag["RepeatEnd"] = 8] = "RepeatEnd";
    MeasureFlag[MeasureFlag["AlternateRepeatEnd"] = 16] = "AlternateRepeatEnd";
    MeasureFlag[MeasureFlag["PresenceMarker"] = 32] = "PresenceMarker";
    MeasureFlag[MeasureFlag["Tonality"] = 64] = "Tonality";
    MeasureFlag[MeasureFlag["PresenceDoubleBar"] = 128] = "PresenceDoubleBar";
})(MeasureFlag = exports.MeasureFlag || (exports.MeasureFlag = {}));
function parseMeasureHeaders(stream, measureCount) {
    const measureHeaders = [];
    let previousHeader = null;
    for (let i = 1; i < measureCount + 1; i++) {
        const flag = stream.readInt8();
        let numerator;
        if (flag & MeasureFlag.KeyNumerator) {
            numerator = stream.readInt8();
        }
        else {
            numerator = previousHeader === null || previousHeader === void 0 ? void 0 : previousHeader.numerator;
        }
        if (numerator === undefined) {
            throw new Error("no numerator found");
        }
        let denominator;
        if (flag & MeasureFlag.KeyDenominator) {
            denominator = stream.readInt8();
        }
        else {
            denominator = previousHeader === null || previousHeader === void 0 ? void 0 : previousHeader.denominator;
        }
        if (denominator === undefined) {
            throw new Error("no denominator found");
        }
        const isRepeatBegin = !!(flag && MeasureFlag.RepeatBegin);
        const hasDoubleBar = !!(flag & MeasureFlag.PresenceDoubleBar);
        const measureHeader = {
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
                    measureHeader.alternateRepeatEnd | alternateRepeatEnd;
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
        }
        else if (i > 1) {
            measureHeader.tonality = previousHeader === null || previousHeader === void 0 ? void 0 : previousHeader.tonality;
        }
        measureHeaders.push(measureHeader);
        previousHeader = measureHeader;
    }
    return measureHeaders;
}
exports.parseMeasureHeaders = parseMeasureHeaders;
var TrackFlag;
(function (TrackFlag) {
    TrackFlag[TrackFlag["Drum"] = 1] = "Drum";
    TrackFlag[TrackFlag["Guitar"] = 2] = "Guitar";
    TrackFlag[TrackFlag["Banjo"] = 4] = "Banjo";
})(TrackFlag = exports.TrackFlag || (exports.TrackFlag = {}));
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
function parseTracks(stream, trackCount, channels) {
    const tracks = [];
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
exports.parseTracks = parseTracks;
function parseChannel(stream, channels) {
    const index = stream.readInt32(true) - 1;
    const effectChannel = stream.readInt32(true) - 1;
    if (index >= 0 && index < channels.length) {
        const channel = Object.assign({}, channels[index]);
        if (channel.instrument < 0) {
            channel.instrument = 0;
        }
        if (!isPercussionChannel(channel.channel)) {
            channel.effectChannel = effectChannel;
        }
        return channel;
    }
}
exports.parseChannel = parseChannel;
exports.QuarterTime = 960;
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
function parseMeasures(stream, measureHeaders, tracks) {
    let startTime = exports.QuarterTime;
    for (const measureHeader of measureHeaders) {
        measureHeader.startTime = startTime;
        for (const track of tracks) {
            const beatCount = stream.readInt32();
            const beats = [];
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
exports.parseMeasures = parseMeasures;
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
function parseBeat(stream, beats, startTime) {
    const flags = stream.readInt8();
    return {};
}
exports.parseBeat = parseBeat;
function parseColor(stream) {
    const color = [
        stream.readInt8(),
        stream.readInt8(),
        stream.readInt8(),
    ];
    return color;
}
exports.parseColor = parseColor;
