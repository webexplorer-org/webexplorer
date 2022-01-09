import { GtpStream } from "./stream";
import {
  BeatEffect,
  BeatStrokeDirection,
  BendEffect,
  Chord,
  ChordAlteration,
  ChordExtension,
  ChordType,
  Clipboard,
  Measure,
  MixTableChange,
  NoteEffect,
  Octave,
  Pitch,
  SlapEffect,
  Song,
  TrillEffect,
  TripletFeel,
  Version,
  CLIPBOARD,
  Duration,
  Fingering,
  HarmonicEffect,
  Lyrics,
  MAX_LINE_COUNT,
  Note,
  SlideType,
  TremoloPickingEffect,
} from "./model";
import { BeatEffectFlag, GtpParser, NoteEffectFlag } from "./gp";

export class Gtp4Parser extends GtpParser {
  parse(stream: GtpStream, version: Version): Song {
    const clipboard = this.parseClipboard(stream, version);

    const info = this.parseInfo(stream);

    const tripletFeel = stream.readBool()
      ? TripletFeel.Eighth
      : TripletFeel.None;

    const lyrics = this.parseLyrics(stream);

    const tempo = stream.readInt32(true);
    const key: [number, number] = [stream.readByte(), 0];

    const _octave = stream.readInt32(true);

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
      clipboard,
      info,
      lyrics,
      tempo,
      key,
      repeatGroups,
      measureHeaders,
      tracks,
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

  parseClipboard(stream: GtpStream, version: Version): Clipboard | undefined {
    if (!version.raw.startsWith("CLIPBOARD")) {
      return;
    }

    const startMeasure = stream.readInt32(true);
    const stopMeasure = stream.readInt32(true);
    const startTrack = stream.readInt32(true);
    const stopTrack = stream.readInt32(true);

    return {
      ...CLIPBOARD,
      startMeasure,
      stopMeasure,
      startTrack,
      stopTrack,
    };
  }

  parseLyrics(stream: GtpStream) {
    const trackChoice = stream.readInt32(true);
    const lyrics: Lyrics = {
      lines: [],
      trackChoice,
    };

    for (let i = 0; i < MAX_LINE_COUNT; i++) {
      const startMeasure = stream.readInt32(true);
      const text = stream.readIntSizeString();
      lyrics.lines.push({
        startMeasure,
        lyrics: text,
      });
    }

    return lyrics;
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
    const fifth = stream.readByte() as ChordAlteration;
    const ninth = stream.readByte() as ChordAlteration;
    const eleventh = stream.readByte() as ChordAlteration;
    const firstFret = stream.readInt32(true);
    const strings = [];
    for (let i = 0; i < 7; i++) {
      const fret = stream.readInt32(true);
      if (i < stringCount) {
        strings.push(fret);
      }
    }

    const barres = [];
    const barreCount = stream.readByte();
    const barreFrets = [
      stream.readByte(),
      stream.readByte(),
      stream.readByte(),
      stream.readByte(),
      stream.readByte(),
    ];
    const barreStarts = [
      stream.readByte(),
      stream.readByte(),
      stream.readByte(),
      stream.readByte(),
      stream.readByte(),
    ];
    const barreEnds = [
      stream.readByte(),
      stream.readByte(),
      stream.readByte(),
      stream.readByte(),
      stream.readByte(),
    ];

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

    const fingerings = [
      stream.readByte() as Fingering,
      stream.readByte() as Fingering,
      stream.readByte() as Fingering,
      stream.readByte() as Fingering,
      stream.readByte() as Fingering,
      stream.readByte() as Fingering,
      stream.readByte() as Fingering,
    ];
    const show = stream.readBool();

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
      fingerings,
      show,
    };
  }

  parseBeatEffect(stream: GtpStream): BeatEffect {
    const flag1 = stream.readByte();
    const flag2 = stream.readByte();
    const beatEffect: BeatEffect = {
      hasRasgueado: !!(flag2 & BeatEffectFlag.Vibrato),
      vibrato: !!(flag1 & BeatEffectFlag.Vibrato),
      fadeIn: !!(flag1 & BeatEffectFlag.FadeIn),
      stroke: {
        direction: BeatStrokeDirection.None,
        value: 0,
      },
      pickStroke: BeatStrokeDirection.None,
      slapEffect: SlapEffect.None,
    };

    if (flag1 & BeatEffectFlag.TremoloBarOrSlapEffect) {
      const flag2 = stream.readByte();
      beatEffect.slapEffect = flag2;
    }

    if (flag2 & BeatEffectFlag.NaturalHarmonic) {
      beatEffect.tremoloBar = this.parseTremoloBar(stream);
    }

    if (flag1 & BeatEffectFlag.BeatStrokeDirection) {
      beatEffect.stroke = this.parseBeatStroke(stream);
    }

    if (flag2 & BeatEffectFlag.WideVibrato) {
      const direction = stream.readByte() as BeatStrokeDirection;
      beatEffect.pickStroke = direction;
    }

    return beatEffect;
  }

  parseTremoloBar(stream: GtpStream): BendEffect {
    return this.parseBend(stream);
  }

  parseMixTableChange(stream: GtpStream, measure: Measure): MixTableChange {
    const mixTableChange = super.parseMixTableChange(stream, measure);
    this.parseMixTableChangeFlags(stream, mixTableChange);

    return mixTableChange;
  }

  /**
    Read mix table change flags.
    The meaning of flags:
    - *0x01*: change volume for all tracks
    - *0x02*: change balance for all tracks
    - *0x04*: change chorus for all tracks
    - *0x08*: change reverb for all tracks
    - *0x10*: change phaser for all tracks
    - *0x20*: change tremolo for all tracks
  */
  parseMixTableChangeFlags(stream: GtpStream, mixTableChange: MixTableChange) {
    const flags = stream.readByte();
    if (mixTableChange.volume) {
      mixTableChange.volume.allTracks = !!(flags & 0x01);
    }
    if (mixTableChange.balance) {
      mixTableChange.balance.allTracks = !!(flags & 0x02);
    }
    if (mixTableChange.chorus) {
      mixTableChange.chorus.allTracks = !!(flags & 0x04);
    }
    if (mixTableChange.reverb) {
      mixTableChange.reverb.allTracks = !!(flags & 0x08);
    }
    if (mixTableChange.phaser) {
      mixTableChange.phaser.allTracks = !!(flags & 0x10);
    }
    if (mixTableChange.tremolo) {
      mixTableChange.tremolo.allTracks = !!(flags & 0x20);
    }
    return flags;
  }

  parseNoteEffect(stream: GtpStream, note: Note): NoteEffect {
    const flag1 = stream.readByte();
    const flag2 = stream.readByte();
    const hammer = !!(flag1 & NoteEffectFlag.HammerOnOrPullOff);
    const letRing = !!(flag1 & NoteEffectFlag.LetRing);
    const staccato = !!(flag2 & NoteEffectFlag.Bend);
    const palmMute = !!(flag2 & NoteEffectFlag.HammerOnOrPullOff);
    const vibrato = !!(flag2 & NoteEffectFlag.Vibrato);

    const effect: NoteEffect = {
      accentuatedNote: false,
      ghostNote: false,
      hammer,
      heavyAccentuatedNote: false,
      letRing,
      palmMute,
      leftHandFinger: Fingering.Open,
      rightHandFinger: Fingering.Open,
      slides: [],
      staccato,
      vibrato,
    };

    if (flag1 & NoteEffectFlag.Bend) {
      effect.bend = this.parseBend(stream);
    }

    if (flag1 & NoteEffectFlag.Grace) {
      effect.grace = this.parseGrace(stream);
    }

    if (flag2 & NoteEffectFlag.Slide) {
      effect.tremoloPicking = this.parseTremoloPicking(stream);
    }

    if (flag2 & NoteEffectFlag.LetRing) {
      effect.slides = this.parseSlides(stream);
    }

    if (flag2 & NoteEffectFlag.Grace) {
      effect.harmonic = this.parseHarmonic(stream, note);
    }

    if (flag2 & NoteEffectFlag.Trill) {
      effect.trill = this.parseTrill(stream);
    }

    return effect;
  }

  parseTremoloPicking(stream: GtpStream): TremoloPickingEffect {
    const byte = stream.readByte();
    const value =
      byte === 1
        ? Duration.eighth
        : byte === 2
        ? Duration.sixteenth
        : Duration.thirtySecond;

    return {
      duration: {
        value,
        tuplet: {
          enters: 1,
          times: 1,
        },
        isDotted: false,
      },
    };
  }

  parseSlides(stream: GtpStream) {
    return [stream.readByte() as SlideType];
  }

  parseHarmonic(stream: GtpStream, note: Note): HarmonicEffect {
    const byte = stream.readByte();

    switch (byte) {
      case 1:
        return { type: 1 };
      case 3:
        return { type: 3 };
      case 4:
        return { type: 4 };
      case 5:
        return { type: 5 };
      case 15: {
        const pitch: Pitch = {
          just: (note.value + 7) / 12,
        };
        return {
          type: 2,
          pitch,
          octave: Octave.Ottava,
        };
      }
      case 17: {
        const pitch: Pitch = {
          just: note.value,
        };
        return {
          type: 2,
          pitch,
          octave: Octave.Quindicesima,
        };
      }
      case 22: {
        const pitch: Pitch = {
          just: note.value,
        };
        return {
          type: 2,
          pitch,
          octave: Octave.Ottava,
        };
      }
      default:
        throw new Error("not supported note effect");
    }
  }

  parseTrill(stream: GtpStream): TrillEffect {
    const fret = stream.readByte();
    const durationType = stream.readByte();
    const duration =
      durationType === 1
        ? Duration.sixteenth
        : durationType === 2
        ? Duration.thirtySecond
        : Duration.sixtyFourth;

    return {
      fret,
      duration,
    };
  }
}
