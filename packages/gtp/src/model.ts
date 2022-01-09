export interface Version {
  raw: string;
  major: string;
  minor: string;
}

export interface RepeatGroup {
  isClosed: boolean;
  measureHeaders: MeasureHeader[];
  openings: MeasureHeader[];
  closings: MeasureHeader[];
}

export function addMeasureHeader(
  repeatGroup: RepeatGroup,
  measureHeader: MeasureHeader
) {
  repeatGroup.measureHeaders.push(measureHeader);

  if (repeatGroup.openings.length === 0) {
    repeatGroup.isClosed = true;
    repeatGroup.closings.push(measureHeader);
  } else if (repeatGroup.isClosed) {
    repeatGroup.isClosed = false;
    repeatGroup.openings.push(measureHeader);
  }
}

export interface Clipboard {
  startMeasure: number;
  stopMeasure: number;
  startTrack: number;
  stopTrack: number;
  startBeat: number;
  stopBeat: number;
  subBarCopy: boolean;
}

export const CLIPBOARD: Clipboard = {
  startMeasure: 1,
  stopMeasure: 1,
  startTrack: 1,
  stopTrack: 1,
  startBeat: 1,
  stopBeat: 1,
  subBarCopy: false,
};

export type KeySignature = [number, number];

export const KeySignatureMap: Record<string, KeySignature> = {
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

export interface LyricLine {
  lyrics: string;
  startMeasure: number;
}

export const MAX_LINE_COUNT = 5;

export interface Lyrics {
  trackChoice: number;
  lines: LyricLine[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Padding {
  right: number;
  top: number;
  left: number;
  bottom: number;
}

export enum HeaderFooterElement {
  None = 0x000,
  Title = 0x001,
  Subtitle = 0x002,
  Artist = 0x004,
  Album = 0x008,
  Words = 0x010,
  Music = 0x020,
  WordsAndMusic = 0x040,
  Copyright = 0x080,
  PageNumber = 0x100,
  All = HeaderFooterElement.Title |
    HeaderFooterElement.Subtitle |
    HeaderFooterElement.Album |
    HeaderFooterElement.Artist |
    HeaderFooterElement.Words |
    HeaderFooterElement.Music |
    HeaderFooterElement.WordsAndMusic |
    HeaderFooterElement.Copyright |
    HeaderFooterElement.PageNumber,
}

export interface RSEEqualizer {
  knobs: number[];
  gain: number;
}

export interface RSEMasterEffect {
  volume: number;
  reverb: number;
  equalizer: RSEEqualizer;
}

export interface SongInfo {
  title: string;
  subtitle: string;
  artist: string;
  album: string;
  words: string;
  music: string;
  copyright: string;
  tab: string;
  instructions: string;
  notices: string[];
}

export interface Song {
  version: Version;
  clipboard?: Clipboard;
  info: SongInfo;
  lyrics: Lyrics;
  tempoName?: string;
  tempo: number;
  key: KeySignature;
  repeatGroups: RepeatGroup[];
  measureHeaders: MeasureHeader[];
  tracks: Track[];
  masterEffect: RSEMasterEffect;
}

export const MIDI_CHANNEL_COUNT = 64;

export interface MidiChannel {
  channel: number;
  effectChannel: number;
  instrument: number;
  volume: number;
  balance: number;
  chorus: number;
  reverb: number;
  phaser: number;
  tremolo: number;
  bank: number;
}

export const DEFAULT_PERCUSSION_CHANNEL = 9;

export function isPercussionChannel(channel: number) {
  return channel % 16 === DEFAULT_PERCUSSION_CHANNEL;
}

export function toChannel(value: number) {
  value = Math.max(-32768, Math.min(32767, (value << 3) - 1));
  return Math.max(value, -1) + 1;
}

export interface DirectionSign {
  name: string;
}

export interface Tuplet {
  enters: number;
  times: number;
}

export const SUPPORTED_TUPLETS = [
  [1, 1],
  [3, 2],
  [5, 4],
  [6, 4],
  [7, 4],
  [9, 8],
  [10, 8],
  [11, 8],
  [12, 8],
  [13, 8],
];

export const QuarterTime = 960;

export const Duration = {
  whole: 1,
  half: 2,
  quarter: 4,
  eighth: 8,
  sixteenth: 16,
  thirtySecond: 32,
  sixtyFourth: 64,
  hundredTwentyEighth: 128,
};

export interface Duration {
  value: number;
  tuplet: Tuplet;
  isDotted: boolean;
}

export interface TimeSignature {
  numerator: number;
  denominator: Duration;
  beams: number[];
}

export const enum TripletFeel {
  None = 0,
  Eighth = 1,
  Sixteenth = 2,
}

export interface MeasureHeader {
  flag: number;
  index: number;
  startTime: number;
  keySignature: [number, number];
  timeSignature: TimeSignature;
  marker?: Marker;
  isRepeatBegin: boolean;
  repeatBegin?: number;
  repeatEnd: number;
  repeatAlternativeEnd: number;
  tripleFeel: TripletFeel;
  direction?: DirectionSign;
  fromDirection?: DirectionSign;
  hasDoubleBar: boolean;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  unused: number;
}

export interface TrackSettings {
  tablature: boolean;
  notation: boolean;
  diagramsAreBelow: boolean;
  showRhythm: boolean;
  forceHorizontal: boolean;
  forceChannels: boolean;
  diagramList: boolean;
  diagramsInScore: boolean;
  autoLetRing: boolean;
  autoBrush: boolean;
  extendRhythmic: boolean;
}

export interface Marker {
  title: string;
  color: Color;
}

export enum Accentuation {
  None = 0,
  VerySoft = 1,
  Soft = 2,
  Medium = 3,
  Strong = 4,
  VeryStrong = 5,
}

export interface RSEInstrument {
  instrument: number;
  unknown: number;
  soundBank: number;
  effectNumber: number;
  effectCategory: string;
  effect: string;
}

export interface TrackRSE {
  instrument: RSEInstrument;
  equalizer: RSEEqualizer;
  humanize: number;
  autoAccentuation: Accentuation;
}

export interface Track {
  flag: number;
  index: number;
  fretCount: number;
  offset: number;
  name: string;
  measures: Measure[];
  stringCount: number;
  strings: GuitarString[];
  port: number;
  channel: MidiChannel | undefined;
  color: Color;
  settings?: TrackSettings;
  useRSE?: boolean;
  rse?: TrackRSE;
}

export interface GuitarString {
  index: number;
  tuning: number;
}

export enum MeasureClef {
  Treble = 0,
  Bass = 1,
  Tenor = 2,
  Alto = 3,
}

export enum LineBreak {
  None = 0,
  Break = 1,
  Protect = 2,
}

export const MEASURE_MAX_VOICE = 2;

export interface Measure {
  startTime: number;
  clef: MeasureClef;
  lineBreak: LineBreak;
  voices: Voice[];
}

export enum VoiceDirection {
  None = 0,
  Up = 1,
  Down = 2,
}

export interface Voice {
  direction: VoiceDirection;
  beats: Beat[];
}

export enum BeatStrokeDirection {
  None = 0,
  Up = 1,
  Down = 2,
}

export interface BeatStroke {
  direction: BeatStrokeDirection;
  value: number;
}

export enum SlapEffect {
  None = 0,
  Tapping = 1,
  Slapping = 2,
  Popping = 3,
}

export interface BeatEffect {
  hasRasgueado: boolean;
  stroke: BeatStroke;
  pickStroke: BeatStrokeDirection;
  chord?: Chord;
  fadeIn: boolean;
  slapEffect: SlapEffect;
  tremoloBar?: BendEffect;
  mixTableChange?: MixTableChange;
  vibrato: boolean;
  harmonic?: HarmonicEffect;
}

export enum TupletBracket {
  None = 0,
  Start = 1,
  End = 2,
}

export interface BeatDisplay {
  breakBeam: boolean;
  forceBeam: boolean;
  beamDirection: VoiceDirection;
  tupletBracket: TupletBracket;
  breakSecondary: number;
  breakSecondaryTuplet: boolean;
  forceBracket: boolean;
}

export enum Octave {
  None = 0,
  Ottava = 1,
  Quindicesima = 2,
  OttavaBassa = 3,
  QuindicesimaBassa = 4,
}

export enum BeatStatus {
  Empty = 0,
  Normal = 1,
  Rest = 2,
}

export interface Beat {
  index: number;
  flag: number;
  notes: Note[];
  duration: Duration;
  text?: string;
  start?: number;
  effect: BeatEffect;
  status: BeatStatus;
  display: BeatDisplay;
  octave: Octave;
}

export type HarmonicEffect =
  | NaturalHarmonic
  | ArtificialHarmonic
  | TappedHarmonic
  | PinchHarmonic
  | SemiHarmonic;

export interface NaturalHarmonic {
  type: 1;
}

export interface ArtificialHarmonic {
  type: 2;
  pitch: Pitch;
  octave: number;
}

export interface TappedHarmonic {
  type: 3;
  fret?: number;
}

export interface PinchHarmonic {
  type: 4;
}

export interface SemiHarmonic {
  type: 5;
}

export enum GraceEffectTransition {
  None = 0,
  Slide = 1,
  Bend = 2,
  Hammer = 3,
}

export interface GraceEffect {
  isDead: boolean;
  isOnBeat: boolean;
  duration: number;
  fret: number;
  transition: GraceEffectTransition;
  velocity: number;
}

export interface TrillEffect {
  fret: number;
  duration: number;
}

export interface TremoloPickingEffect {
  duration: Duration;
}

export enum SlideType {
  IntoFromAbove = -2,
  IntoFromBelow = -1,
  None = 0,
  ShiftSlideTo = 1,
  LegatoSlideTo = 2,
  OutDownwards = 3,
  OutUpwards = 4,
}

export enum Fingering {
  Open = -1,
  Thumb = 0,
  Index = 1,
  Middle = 2,
  Annular = 3,
  Little = 4,
}

export interface NoteEffect {
  accentuatedNote: boolean;
  bend?: BendEffect;
  ghostNote: boolean;
  grace?: GraceEffect;
  hammer: boolean;
  harmonic?: HarmonicEffect;
  heavyAccentuatedNote: boolean;
  leftHandFinger: Fingering;
  letRing: boolean;
  palmMute: boolean;
  rightHandFinger: Fingering;
  slides: SlideType[];
  staccato: boolean;
  tremoloPicking?: TremoloPickingEffect;
  trill?: TrillEffect;
  vibrato: boolean;
}

export enum NoteType {
  Rest = 0,
  Normal = 1,
  Tie = 2,
  Dead = 3,
}

export interface Note {
  value: number;
  velocity: number;
  duration?: number;
  tuplet?: number;
  string: number;
  effect?: NoteEffect;
  durationPercent?: number;
  swapAccidentals?: boolean;
  type: NoteType;
}

export interface Chord {
  length: number;
  sharp?: boolean;
  root?: Pitch;
  type?: ChordType;
  extension?: ChordExtension;
  bass?: Pitch;
  tonality?: ChordAlteration;
  add?: boolean;
  name: string;
  fifth?: ChordAlteration;
  ninth?: ChordAlteration;
  eleventh?: ChordAlteration;
  firstFret?: number;
  strings: number[];
  barres: Barre[];
  omissions: boolean[];
  fingerings: Fingering[];
  show?: boolean;
  newFormat?: boolean;
}

export enum ChordType {
  Major = 0,
  Seventh = 1,
  MajorSeventh = 2,
  Sixth = 3,
  Minor = 4,
  MinorSeventh = 5,
  MinorMajor = 6,
  MinorSixth = 7,
  SuspendedSecond = 8,
  SuspendedFourth = 9,
  SeventhSuspendedSecond = 10,
  SeventhSuspendedFourth = 11,
  Diminished = 12,
  Augmented = 13,
  Power = 14,
}

export interface Barre {
  fret: number;
  start: number;
  end: number;
}

export enum ChordAlteration {
  Perfect = 0,
  Diminished = 1,
  Augmented = 2,
}

export enum ChordExtension {
  None = 0,
  Ninth = 1,
  Eleventh = 2,
  Thirteenth = 3,
}

export interface Pitch {
  just: string | number;
  accidental?: number;
  value?: number;
  intonation?: string;
}

export interface MixTableItem {
  value: number;
  duration: number;
  allTracks: boolean;
}

export interface WahEffect {
  vlaue: number;
  display: boolean;
}

export interface MixTableChange {
  rse?: RSEInstrument;
  instrument?: MixTableItem;
  volume?: MixTableItem;
  balance?: MixTableItem;
  chorus?: MixTableItem;
  reverb?: MixTableItem;
  phaser?: MixTableItem;
  tremolo?: MixTableItem;
  tempoName: string;
  tempo?: MixTableItem;
  hideTempo: boolean;
  wah?: WahEffect;
  useRSE: boolean;
}

export enum BendType {
  None = 0,
  Bend = 1,
  BendRelease = 2,
  BendReleaseBend = 3,
  PreBend = 4,
  PreBendRelease = 5,
  Dip = 6,
  Dive = 7,
  ReleaseUp = 8,
  InvertedDip = 9,
  Return = 10,
  ReleaseDown = 11,
}

export interface BendPoint {
  position: number;
  value: number;
  vibrato: boolean;
}

export interface BendEffect {
  type: BendType;
  value: number;
  points: BendPoint[];
}
