import {
  Song,
  addMeasureHeader,
  Beat,
  BeatEffect,
  BeatStatus,
  BeatStroke,
  BeatStrokeDirection,
  BendEffect,
  BendType,
  Chord,
  ChordAlteration,
  ChordExtension,
  ChordType,
  Color,
  Duration,
  Fingering,
  GraceEffect,
  GraceEffectTransition,
  GuitarString,
  isPercussionChannel,
  KeySignature,
  KeySignatureMap,
  LineBreak,
  Measure,
  MeasureClef,
  MeasureHeader,
  MidiChannel,
  MIDI_CHANNEL_COUNT,
  MixTableChange,
  Note,
  NoteEffect,
  NoteType,
  Octave,
  Pitch,
  QuarterTime,
  RepeatGroup,
  SlapEffect,
  SlideType,
  SongInfo,
  TimeSignature,
  toChannel,
  Track,
  TripletFeel,
  TupletBracket,
  Version,
  Voice,
  VoiceDirection,
} from "./model";
import { GtpStream } from "./stream";

export class GtpParser {
  parse(stream: GtpStream, version: Version): Song {
    throw new Error("should call subclass.parse");
  }

  parseInfo(stream: GtpStream, options = { music: false }): SongInfo {
    const title = stream.readIntByteSizeString();
    const subtitle = stream.readIntByteSizeString();
    const artist = stream.readIntByteSizeString();
    const album = stream.readIntByteSizeString();
    const words = stream.readIntByteSizeString();
    const music = options.music ? stream.readIntByteSizeString() : words;
    const copyright = stream.readIntByteSizeString();
    const tab = stream.readIntByteSizeString();
    const instructions = stream.readIntByteSizeString();
    const noticeCount = stream.readInt32(true);
    const notices = [];
    for (let i = 0; i < noticeCount; i++) {
      const notice = stream.readIntByteSizeString();
      notices.push(notice);
    }

    return {
      title,
      subtitle,
      artist,
      album,
      words,
      music,
      copyright,
      tab,
      instructions,
      notices,
    };
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
  parseMidiChannels(stream: GtpStream) {
    const channels = [];
    for (let i = 0; i < MIDI_CHANNEL_COUNT; i++) {
      const channel = i;
      const effectChannel = i;
      let instrument = stream.readInt32(true);
      const volume = stream.readByte();
      const balance = stream.readByte();
      const chorus = stream.readByte();
      const reverb = stream.readByte();
      const phaser = stream.readByte();
      const tremolo = stream.readByte();

      stream.forward(2);

      if (isPercussionChannel(channel) && instrument === -1) {
        instrument = 0;
      }

      channels.push({
        channel,
        effectChannel,
        instrument,
        volume: toChannel(volume),
        balance: toChannel(balance),
        chorus: toChannel(chorus),
        reverb: toChannel(reverb),
        phaser: toChannel(phaser),
        tremolo: toChannel(tremolo),
        bank: 0,
      });
    }

    return channels;
  }

  /*
  The first byte is the measure's flags. It lists the data given in the current measure.
  - *0x01*: numerator of the time signature
  - *0x02*: denominator of the time signature
  - *0x04*: beginning of repeat
  - *0x08*: end of repeat
  - *0x10*: number of alternate ending
  - *0x20*: presence of a marker
  - *0x40*: tonality of the measure
  - *0x80*: presence of a double bar
  Each of these elements is present only if the corresponding bit
  is a 1.
  The different elements are written (if they are present) from
  lowest to highest bit.
  Exceptions are made for the double bar and the beginning of
  repeat whose sole presence is enough, complementary data is not
  necessary.
  - Numerator of the time signature: :ref:`byte`.
  - Denominator of the time signature: :ref:`byte`.
  - End of repeat: :ref:`byte`.
    Number of repeats until the previous beginning of repeat.
  - Number of alternate ending: :ref:`byte`.
  - Marker: see :meth:`GP3File.readMarker`.
  - Tonality of the measure: 2 :ref:`Bytes <byte>`. These values
    encode a key signature change on the current piece. First byte
    is key signature root, second is key signature type.
  */
  parseMeasureHeaders(
    stream: GtpStream,
    measureCount: number,
    tripletFeel: TripletFeel
  ) {
    const repeatGroups: RepeatGroup[] = [];
    let repeatGroup: RepeatGroup = {
      isClosed: false,
      openings: [],
      closings: [],
      measureHeaders: [],
    };
    repeatGroups.push(repeatGroup);

    const measureHeaders: MeasureHeader[] = [];
    let previousHeader: MeasureHeader | null = null;
    for (let index = 1; index < measureCount + 1; index++) {
      const measureHeader = this.parseMeasureHeader(
        stream,
        measureHeaders,
        index,
        {
          keySignature: previousHeader?.keySignature!,
          timeSignature: previousHeader?.timeSignature!,
          tripletFeel,
        }
      );

      if (
        measureHeader.isRepeatBegin ||
        (repeatGroup.isClosed && measureHeader.repeatAlternativeEnd <= 0)
      ) {
        repeatGroup = {
          isClosed: false,
          openings: [],
          closings: [],
          measureHeaders: [],
        };
        repeatGroups.push(repeatGroup);
      }
      addMeasureHeader(repeatGroup, measureHeader);

      measureHeaders.push(measureHeader);

      previousHeader = measureHeader;
    }

    return { measureHeaders, repeatGroups };
  }

  parseMeasureHeader(
    stream: GtpStream,
    measureHeaders: MeasureHeader[],
    index: number,
    options: {
      timeSignature: TimeSignature;
      keySignature: KeySignature;
      tripletFeel: TripletFeel;
    }
  ) {
    const flag = stream.readInt8();

    const timeSignature: TimeSignature = {
      numerator: options.timeSignature?.numerator,
      denominator: {
        ...options.timeSignature?.denominator,
      },
      beams: [],
    };
    if (flag & MeasureHeaderFlag.TimeSignatureNumerator) {
      timeSignature.numerator = stream.readInt8();
    }

    if (flag & MeasureHeaderFlag.TimeSignatureDenominator) {
      timeSignature.denominator.value = stream.readInt8();
    }

    const isRepeatBegin = !!(flag & MeasureHeaderFlag.RepeatBegin);
    const hasDoubleBar = !!(flag & MeasureHeaderFlag.PresenceDoubleBar);

    const measureHeader: MeasureHeader = {
      flag,
      index,
      startTime: 0,
      timeSignature,
      keySignature: KeySignatureMap.CMajor,
      isRepeatBegin,
      hasDoubleBar,
      tripleFeel: options.tripletFeel,
      repeatEnd: 0,
      repeatAlternativeEnd: 0,
    };

    if (flag & MeasureHeaderFlag.RepeatEnd) {
      measureHeader.repeatEnd = stream.readInt8();
    }

    if (flag & MeasureHeaderFlag.AlternateRepeatEnd) {
      const value = stream.readInt8();
      let alternateRepeatEnd = 0;
      for (let i = measureHeaders.length - 1; i >= 0; i--) {
        const previousHeader = measureHeaders[i];
        if (previousHeader.isRepeatBegin) {
          break;
        }

        alternateRepeatEnd =
          previousHeader.repeatAlternativeEnd | alternateRepeatEnd;
      }
      measureHeader.repeatAlternativeEnd =
        (1 << value) - (1 ^ alternateRepeatEnd);
    }

    if (flag & MeasureHeaderFlag.PresenceMarker) {
      const title = stream.readIntByteSizeString();
      const color = this.parseColor(stream);
      measureHeader.marker = {
        title,
        color,
      };
    }

    if (flag & MeasureHeaderFlag.Tonality) {
      const root = stream.readByte();
      const type = stream.readByte();
      measureHeader.keySignature = [root, type];
    } else if (index > 0) {
      measureHeader.keySignature = options.keySignature;
    }

    return measureHeader;
  }

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
  parseTracks(stream: GtpStream, trackCount: number, channels: MidiChannel[]) {
    const tracks: Track[] = [];

    for (let index = 0; index < trackCount; index++) {
      const flag = stream.readInt8();
      const name = stream.readByteSizeString(40);
      const stringCount = stream.readInt32(true);
      const strings: GuitarString[] = [];
      for (let i = 0; i < 7; i++) {
        const tuning = stream.readInt32(true);
        if (i < stringCount) {
          strings.push({
            index: i + 1,
            tuning,
          });
        }
      }
      const port = stream.readInt32(true);
      const channel = this.parseChannel(stream, channels);
      const fretCount = stream.readInt32(true);
      const offset = stream.readInt32(true);
      const color = this.parseColor(stream);

      tracks.push({
        index,
        flag,
        name,
        stringCount,
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

  parseChannel(
    stream: GtpStream,
    channels: MidiChannel[]
  ): MidiChannel | undefined {
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
  parseMeasures(
    stream: GtpStream,
    measureHeaders: MeasureHeader[],
    tracks: Track[]
  ) {
    let startTime = QuarterTime;
    for (const measureHeader of measureHeaders) {
      measureHeader.startTime = startTime;
      for (const track of tracks) {
        const measure: Measure = {
          startTime,
          voices: [],
          clef: MeasureClef.Alto,
          lineBreak: LineBreak.None,
        };

        const voice = this.parseVoice(stream, track, measure);
        measure.voices.push(voice);

        track.measures.push(measure);
      }

      startTime =
        startTime +
        measureHeader.timeSignature.numerator *
          measureHeader.timeSignature.denominator.value;
    }
  }

  parseVoice(stream: GtpStream, track: Track, measure: Measure): Voice {
    const voice: Voice = {
      direction: VoiceDirection.None,
      beats: [],
    };

    const beatCount = stream.readInt32(true);
    let startTime = measure.startTime;
    for (let i = 0; i < beatCount; i++) {
      const beat = this.parseBeat(stream, i, startTime, voice, track, measure);

      startTime = startTime + beat.duration.value;
      voice.beats.push(beat);
    }

    return voice;
  }

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
  parseBeat(
    stream: GtpStream,
    index: number,
    start: number,
    voice: Voice,
    track: Track,
    measure: Measure
  ): Beat {
    const flag = stream.readInt8();

    const status =
      flag & BeatFlag.Status
        ? (stream.readInt8() as BeatStatus)
        : BeatStatus.Normal;

    const duration = this.parseDuration(
      stream,
      !!(flag & BeatFlag.Dotted),
      !!(flag & BeatFlag.NTuplet)
    );

    let beat: Beat | undefined;

    for (let i = voice.beats.length - 1; i >= 0; i--) {
      if (voice.beats[i].start === start) {
        beat = voice.beats[i];
      }
    }

    if (!beat) {
      beat = {
        index,
        flag,
        status,
        duration,
        notes: [],
        octave: Octave.None,
        effect: {
          hasRasgueado: false,
          stroke: {
            direction: BeatStrokeDirection.None,
            value: 0,
          },
          fadeIn: false,
          slapEffect: SlapEffect.None,
          pickStroke: BeatStrokeDirection.None,
          vibrato: false,
        },
        display: {
          breakBeam: false,
          forceBeam: false,
          beamDirection: VoiceDirection.None,
          tupletBracket: TupletBracket.None,
          breakSecondary: 0,
          breakSecondaryTuplet: false,
          forceBracket: false,
        },
      };
    }

    if (flag & BeatFlag.ChordDiagram) {
      beat.effect.chord = this.parseChord(stream, track.strings.length);
    }

    if (flag & BeatFlag.Text) {
      beat.text = stream.readIntByteSizeString();
    }

    if (flag & BeatFlag.Effect) {
      const chord = beat.effect.chord;
      beat.effect = this.parseBeatEffect(stream);
      beat.effect.chord = chord;
    }

    if (flag & BeatFlag.MixTable) {
      beat.effect.mixTableChange = this.parseMixTableChange(stream, measure);
    }

    beat.notes = this.parseNotes(stream, track);

    return beat;
  }

  parseDuration(stream: GtpStream, isDotted: boolean, isTuplet: boolean) {
    const value = 1 << (stream.readInt8() + 2);

    const duration: Duration = {
      value,
      isDotted,
      tuplet: {
        enters: 1,
        times: 1,
      },
    };

    if (isTuplet) {
      const tuplet = stream.readInt32(true);
      switch (tuplet) {
        case 3:
          duration.tuplet = {
            enters: 3,
            times: 2,
          };
          break;
        case 5:
          duration.tuplet = {
            enters: 5,
            times: 4,
          };
          break;
        case 6:
          duration.tuplet = {
            enters: 6,
            times: 4,
          };
          break;
        case 7:
          duration.tuplet = {
            enters: 7,
            times: 4,
          };
          break;
        case 9:
          duration.tuplet = {
            enters: 9,
            times: 8,
          };
          break;
        case 10:
          duration.tuplet = {
            enters: 10,
            times: 8,
          };
          break;
        case 11:
          duration.tuplet = {
            enters: 11,
            times: 8,
          };
          break;
        case 12:
          duration.tuplet = {
            enters: 12,
            times: 8,
          };
          break;
        case 13:
          duration.tuplet = {
            enters: 13,
            times: 8,
          };
      }
    }

    return duration;
  }

  parseChord(stream: GtpStream, stringCount: number): Chord {
    const isNewFormat = stream.readBool();
    if (isNewFormat) {
      return this.parseNewFormatChord(stream, stringCount);
    } else {
      return this.parseOldFormatChord(stream, stringCount);
    }
  }

  parseOldFormatChord(stream: GtpStream, stringCount: number): Chord {
    const name = stream.readIntByteSizeString();
    const firstFret = stream.readInt32(true);
    const strings = [];
    if (firstFret) {
      for (let i = 0; i < 6; i++) {
        const fret = stream.readInt32(true);
        if (i < stringCount) {
          strings.push(fret);
        }
      }
    }

    return {
      length: stringCount,
      name,
      firstFret,
      strings,
      barres: [],
      fingerings: [],
      omissions: [],
    };
  }

  parseNewFormatChord(stream: GtpStream, stringCount: number): Chord {
    const sharp = stream.readBool();
    stream.forward(3);

    const intonation = sharp ? "sharp" : "flat";

    const root: Pitch = {
      just: stream.readInt32(true),
      intonation,
    };
    const type = stream.readInt32(true) as ChordType;
    const extension = stream.readInt32(true) as ChordExtension;
    const bass = {
      just: stream.readInt32(true),
      intonation,
    };
    const tonality = stream.readInt32(true) as ChordAlteration;
    const add = stream.readBool();
    const name = stream.readByteSizeString(22);
    const fifth = stream.readInt32(true) as ChordAlteration;
    const ninth = stream.readInt32(true) as ChordAlteration;
    const eleventh = stream.readInt32(true) as ChordAlteration;
    const firstFret = stream.readInt32(true);
    const strings = [];
    for (let i = 0; i < 6; i++) {
      const fret = stream.readInt32(true);
      if (i < stringCount) {
        strings.push(fret);
      }
    }

    const barres = [];
    const barreCount = stream.readInt32(true);
    const barreFrets = [stream.readInt32(true), stream.readInt32(true)];
    const barreStarts = [stream.readInt32(true), stream.readInt32(true)];
    const barreEnds = [stream.readInt32(true), stream.readInt32(true)];

    for (let fret = 0; fret < barreFrets.length; fret++) {
      for (let start = 0; start < barreStarts.length; start++) {
        for (let end = 0; end < barreEnds.length; end++) {
          for (let i = 0; i < barreCount; i++) {
            barres.push({
              fret: barreFrets[fret],
              start: barreStarts[start],
              end: barreEnds[end],
            });
          }
        }
      }
    }

    const omissions = [
      stream.readBool(),
      stream.readBool(),
      stream.readBool(),
      stream.readBool(),
      stream.readBool(),
      stream.readBool(),
      stream.readBool(),
    ];
    stream.forward(1);

    return {
      length: stringCount,
      sharp,
      root,
      type,
      extension,
      bass,
      tonality,
      add,
      name,
      fifth,
      ninth,
      eleventh,
      firstFret,
      strings,
      barres,
      omissions,
      fingerings: [],
    };
  }

  parseBeatEffect(stream: GtpStream): BeatEffect {
    const flag = stream.readByte();
    const beatEffect: BeatEffect = {
      hasRasgueado: false,
      vibrato: !!(flag & BeatEffectFlag.Vibrato),
      fadeIn: !!(flag & BeatEffectFlag.FadeIn),
      stroke: {
        direction: BeatStrokeDirection.None,
        value: 0,
      },
      pickStroke: BeatStrokeDirection.None,
      slapEffect: SlapEffect.None,
    };

    if (flag & BeatEffectFlag.TremoloBarOrSlapEffect) {
      const flag2 = stream.readByte();
      beatEffect.slapEffect = flag2;
      if (beatEffect.slapEffect === SlapEffect.None) {
        beatEffect.tremoloBar = this.parseTremoloBarEffect(stream);
      } else {
        stream.readInt32();
      }
    }

    if (flag & BeatEffectFlag.BeatStrokeDirection) {
      beatEffect.stroke = this.parseBeatStroke(stream);
    }

    if (flag & BeatEffectFlag.NaturalHarmonic) {
      beatEffect.harmonic = { type: 1 };
    }
    if (flag & BeatEffectFlag.ArtificialHarmonic) {
      beatEffect.harmonic = {
        type: 2,
        pitch: { just: 0 },
        octave: Octave.None,
      };
    }

    return beatEffect;
  }

  parseTremoloBarEffect(stream: GtpStream): BendEffect {
    const value = stream.readInt32(true);

    const effect: BendEffect = {
      type: BendType.Dip,
      value,
      points: [
        { position: 0, value: 0, vibrato: false },
        { position: 0, value: 0, vibrato: false },
        { position: 0, value: 0, vibrato: false },
      ],
    };

    return effect;
  }

  parseBeatStroke(stream: GtpStream): BeatStroke {
    const up = stream.readByte();
    const down = stream.readByte();

    if (up > 0) {
      return {
        direction: BeatStrokeDirection.Up,
        value: this.toStrokeValue(up),
      };
    } else {
      return {
        direction: BeatStrokeDirection.Down,
        value: this.toStrokeValue(down),
      };
    }
  }

  toStrokeValue(value: number) {
    switch (value) {
      case 1:
        return Duration.hundredTwentyEighth;
      case 2:
        return Duration.sixtyFourth;
      case 3:
        return Duration.thirtySecond;
      case 4:
        return Duration.sixteenth;
      case 5:
        return Duration.eighth;
      case 6:
        return Duration.quarter;
      default:
        return Duration.sixtyFourth;
    }
  }

  parseMixTableChange(stream: GtpStream, measure: Measure) {
    const mixTableChange: MixTableChange = {
      hideTempo: false,
      useRSE: false,
      tempoName: "",
    };

    const instrument = stream.readByte();
    if (instrument >= 0) {
      mixTableChange.instrument = {
        value: instrument,
        duration: 0,
        allTracks: false,
      };
    }

    const volume = stream.readByte();
    if (volume >= 0) {
      mixTableChange.volume = { value: volume, duration: 0, allTracks: false };
    }

    const balance = stream.readByte();
    if (balance >= 0) {
      mixTableChange.balance = {
        value: balance,
        duration: 0,
        allTracks: false,
      };
    }

    const chorus = stream.readByte();
    if (chorus >= 0) {
      mixTableChange.chorus = { value: chorus, duration: 0, allTracks: false };
    }

    const reverb = stream.readByte();
    if (reverb >= 0) {
      mixTableChange.reverb = { value: reverb, duration: 0, allTracks: false };
    }

    const phaser = stream.readByte();
    if (phaser >= 0) {
      mixTableChange.phaser = { value: phaser, duration: 0, allTracks: false };
    }

    const tremolo = stream.readByte();
    if (tremolo >= 0) {
      mixTableChange.tremolo = {
        value: tremolo,
        duration: 0,
        allTracks: false,
      };
    }

    const tempo = stream.readInt32(true);
    if (tempo) {
      mixTableChange.tempo = { value: tempo, duration: 0, allTracks: false };
    }

    if (mixTableChange.volume) {
      mixTableChange.volume.duration = stream.readByte();
    }

    if (mixTableChange.balance) {
      mixTableChange.balance.duration = stream.readByte();
    }

    if (mixTableChange.chorus) {
      mixTableChange.chorus.duration = stream.readByte();
    }

    if (mixTableChange.reverb) {
      mixTableChange.reverb.duration = stream.readByte();
    }

    if (mixTableChange.phaser) {
      mixTableChange.phaser.duration = stream.readByte();
    }

    if (mixTableChange.tremolo) {
      mixTableChange.tremolo.duration = stream.readByte();
    }

    if (mixTableChange.tempo) {
      mixTableChange.tempo.duration = stream.readByte();
      mixTableChange.hideTempo = false;
    }

    return mixTableChange;
  }

  parseNotes(stream: GtpStream, track: Track) {
    const flag = stream.readByte();
    const notes: Note[] = [];
    for (const string of track.strings) {
      if (flag & (1 << (7 - string.index))) {
        const note = this.parseNote(stream, track, string);
        notes.push(note);
      }
    }

    return notes;
  }

  parseNote(stream: GtpStream, track: Track, string: GuitarString) {
    const note: Note = {
      value: 0,
      type: NoteType.Rest,
      string: string.index,
      velocity: 0,
      durationPercent: 1.0,
      swapAccidentals: false,
    };

    const flag = stream.readByte();
    if (flag & NoteFlag.Fret) {
      note.type = stream.readByte();
    }

    if (flag & NoteFlag.TimeIndependent) {
      note.duration = stream.readByte();
      note.tuplet = stream.readByte();
    }

    if (flag & NoteFlag.Dynamics) {
      const dynamics = stream.readByte();
      note.velocity = dynamics;
    }

    if (flag & NoteFlag.Fret) {
      const fret = stream.readUByte();
      if (note.type === NoteType.Tie) {
        for (const measure of track.measures) {
          for (const voice of measure.voices) {
            for (const beat of voice.beats) {
              for (const oldNote of beat.notes) {
                if (oldNote.string === string.index) {
                  note.value = oldNote.value;
                }
              }
            }
          }
        }
      } else {
        note.value = Math.max(0, Math.min(99, fret));
      }
    }

    if (flag & NoteFlag.HandFingering) {
      const left = stream.readUByte();
      const right = stream.readUByte();
      if (note.effect) {
        note.effect.leftHandFinger = left;
        note.effect.rightHandFinger = right;
      }
    }

    if (flag & NoteFlag.NoteEffectPresence) {
      note.effect = this.parseNoteEffect(stream, note);
    }

    return note;
  }

  parseNoteEffect(stream: GtpStream, note: Note): NoteEffect {
    const flag = stream.readByte();
    const effect: NoteEffect = {
      accentuatedNote: false,
      ghostNote: false,
      hammer: false,
      heavyAccentuatedNote: false,
      letRing: false,
      palmMute: false,
      leftHandFinger: Fingering.Open,
      rightHandFinger: Fingering.Open,
      slides: [],
      staccato: false,
      vibrato: false,
    };

    if (flag & NoteEffectFlag.Bend) {
      effect.bend = this.parseBend(stream);
    }

    if (flag & NoteEffectFlag.Grace) {
      effect.grace = this.parseGrace(stream);
    }

    if (flag & NoteEffectFlag.Slide) {
      effect.slides = this.parseSlides(stream);
    }

    return effect;
  }

  parseBend(stream: GtpStream): BendEffect {
    const type = stream.readByte();
    const value = stream.readInt32(true);
    const points = [];
    const pointCount = stream.readInt32(true);
    for (let i = 0; i < pointCount; i++) {
      const position = stream.readInt32(true);
      const value = stream.readInt32(true);
      const vibrato = stream.readBool();
      points.push({
        position,
        value,
        vibrato,
      });
    }

    return { type, value, points };
  }

  parseGrace(stream: GtpStream): GraceEffect {
    const fret = stream.readByte();
    const velocity = stream.readByte();
    const duration = 1 << (7 - stream.readByte());
    const isDead = fret == -1;
    const isOnBeat = false;
    const transition = stream.readByte() as GraceEffectTransition;

    return {
      fret,
      velocity,
      duration,
      transition,
      isDead,
      isOnBeat,
    };
  }

  parseSlides(stream: GtpStream) {
    return [SlideType.ShiftSlideTo];
  }

  parseColor(stream: GtpStream): Color {
    const color = {
      r: stream.readByte(),
      g: stream.readByte(),
      b: stream.readByte(),
      unused: stream.readByte(),
    };

    return color;
  }
}

export enum MeasureHeaderFlag {
  TimeSignatureNumerator = 0x01,
  TimeSignatureDenominator = 0x02,
  RepeatBegin = 0x04,
  RepeatEnd = 0x08,
  AlternateRepeatEnd = 0x10,
  PresenceMarker = 0x20,
  Tonality = 0x40,
  PresenceDoubleBar = 0x80,
}

export enum TrackFlag {
  Drum = 0x01,
  Guitar = 0x02,
  Banjo = 0x04,
}

export enum BeatFlag {
  Dotted = 0x01,
  ChordDiagram = 0x02,
  Text = 0x04,
  Effect = 0x08,
  MixTable = 0x10,
  NTuplet = 0x20,
  Status = 0x40,
}

export enum BeatEffectFlag {
  Vibrato = 0x01,
  WideVibrato = 0x02,
  NaturalHarmonic = 0x04,
  ArtificialHarmonic = 0x08,
  FadeIn = 0x10,
  TremoloBarOrSlapEffect = 0x20,
  BeatStrokeDirection = 0x40,
}

export enum NoteFlag {
  TimeIndependent = 0x01,
  HeavyAccentuated = 0x02,
  Ghost = 0x04,
  NoteEffectPresence = 0x08,
  Dynamics = 0x10,
  Fret = 0x20,
  Accentuated = 0x40,
  HandFingering = 0x80,
}

export enum NoteEffectFlag {
  Bend = 0x01,
  HammerOnOrPullOff = 0x02,
  Slide = 0x04,
  LetRing = 0x08,
  Grace = 0x10,
  Trill = 0x20,
  Vibrato = 0x40,
}
