import {
  Stream,
  repeat,
  Parser,
  sequence,
  map,
  match,
  varLen,
  moveTo,
  uint8,
  uint16,
  uint32,
  skip,
  pipe,
  slice,
} from "@webexplorer/specs";
import { BufferBuilder, bytesToString } from "@webexplorer/common";

// https://github.com/kovidgoyal/calibre/blob/master/format_docs/pdb/mobi.txt

export enum Compression {
  NoCompression = 1,
  PalmDDC = 2,
  HuffCDIC = 17480,
}

export enum EncryptionType {
  NoEncryption = 0,
  OldMobipocket = 1,
  MobipocketEncryption = 2,
}

export type PDBHeader = {
  name: string;
  attr: number;
  version: number;
  ctime: number;
  mtime: number;
  btime: number;
  modificationNumber: number;
  appInfoOffset: number;
  sortInfoOffset: number;
  type: string;
  creator: string;
  uniqueId: number;
  nextRec: number;
};

export type Record = {
  offset: number;
  attr: number;
  uniqueId: number;
};

export type PalmDDCHeader = {
  compression: Compression;
  textLength: number;
  recordCount: number;
  recordSize: number;
  encryptionType: EncryptionType;
};

export type MobiHeader = {
  identifier: number;
  headerLength: number;
  mobiType: number;
  textEncoding: number;
  uniqueId: number;
  generatorVersion: number;
  firstNonbookIndex: number;
  fullNameOffset: number;
  fullNameLength: number;
  language: number;
  inputLanguage: number;
  outputLanguage: number;
  formatVersion: number;
  firstImageIdx: number;
  huffRecIndex: number;
  huffRecCount: number;
  datpRecIndex: number;
  datpRecCount: number;
  exthFlags: number;
  drmOffset: number;
  drmCount: number;
  drmSize: number;
  drmFlags: number;
  extraFlags: number;
};

export type MobiMetadata = {
  pdbHeader: PDBHeader;
  recordList: Record[];
  palmDDCHeader: PalmDDCHeader;
  mobiHeader: MobiHeader;
};

export type Mobi = {
  metadata: MobiMetadata;
  text: string;
};

export function parse_(buffer: ArrayBuffer): Mobi {
  const stream = new Stream(buffer);
  const mobiHeader = parseMobiHeader(stream);

  const metadata = {
    pdbHeader,
    recordList,
    palmDDCHeader,
    mobiHeader,
  };

  const text = readText(stream, metadata);

  return {
    metadata,
    text,
  };
}

export function parseMobiHeader(stream: Stream) {
  const startOffset = stream.offset;

  const identifier = stream.readUint32();
  const headerLength = stream.readUint32();
  const mobiType = stream.readUint32();
  const textEncoding = stream.readUint32();
  const uniqueId = stream.readUint32();
  const generatorVersion = stream.readUint32();

  stream.forward(40);

  const firstNonbookIndex = stream.readUint32();
  const fullNameOffset = stream.readUint32();
  const fullNameLength = stream.readUint32();

  const language = stream.readUint32();
  const inputLanguage = stream.readUint32();
  const outputLanguage = stream.readUint32();
  const formatVersion = stream.readUint32();
  const firstImageIdx = stream.readUint32();

  const huffRecIndex = stream.readUint32();
  const huffRecCount = stream.readUint32();
  const datpRecIndex = stream.readUint32();
  const datpRecCount = stream.readUint32();

  const exthFlags = stream.readUint32();

  stream.forward(36);

  const drmOffset = stream.readUint32();
  const drmCount = stream.readUint32();
  const drmSize = stream.readUint32();
  const drmFlags = stream.readUint32();

  stream.forward(8);

  stream.forward(4);

  stream.forward(46);

  const extraFlags = stream.readUint16();

  stream.moveTo(startOffset + headerLength);

  return {
    identifier,
    headerLength,
    mobiType,
    textEncoding,
    uniqueId,
    generatorVersion,
    firstNonbookIndex,
    fullNameOffset,
    fullNameLength,
    language,
    inputLanguage,
    outputLanguage,
    formatVersion,
    firstImageIdx,
    huffRecIndex,
    huffRecCount,
    datpRecIndex,
    datpRecCount,
    exthFlags,
    drmOffset,
    drmCount,
    drmSize,
    drmFlags,
    extraFlags,
  };
}

export function readText(stream: Stream, metadata: MobiMetadata) {
  const { palmDDCHeader } = metadata;
  const buffers = [];
  let total = 0;
  for (let i = 1; i <= palmDDCHeader.recordCount; i++) {
    const buffer = readTextRecord(stream, metadata, i);
    buffers.push(buffer);
    total += buffer.length;
  }

  let offset = 0;
  const result = new Uint8Array(total);
  for (const buffer of buffers) {
    result.set(buffer, offset);
    offset = offset + buffer.length;
  }

  return new TextDecoder("utf-8").decode(result);
}

export function readTextRecord(
  stream: Stream,
  metadata: MobiMetadata,
  index: number
) {
  const { palmDDCHeader, mobiHeader, recordList } = metadata;
  const flags = mobiHeader.extraFlags;
  const begin = recordList[index].offset;
  const end = recordList[index + 1].offset;

  let data = new Uint8Array(stream.view.buffer.slice(begin, end));

  let pos = data.length - 1;
  let extra = 0;
  for (let i = 15; i > 0; i--) {
    if (flags & (1 << i)) {
      let res = getVarLen(data, pos);
      let size = res[0];
      let l = res[1];
      pos = res[2];
      pos -= size - l;
      extra += size;
    }
  }
  if (flags & 1) {
    let a = data[pos];
    extra += (a & 0x3) + 1;
  }

  data = new Uint8Array(stream.view.buffer.slice(begin, end - extra));
  if (palmDDCHeader.compression === Compression.PalmDDC) {
    const buffer = uncompressionLZ77(data);
    data = buffer.combine();
    return data;
  } else {
    return data;
  }
}

export function getVarLen(data: Uint8Array, pos: number) {
  let l = 0;
  let size = 0;
  let byteCount = 0;
  let mask = 0x7f;
  let stopFlag = 0x80;
  let shift = 0;
  for (let i = 0; ; i++) {
    const byte = data[pos];
    size |= (byte & mask) << shift;
    shift += 7;
    l += 1;
    byteCount += 1;
    pos -= 1;

    const toStop = byte & stopFlag;
    if (byteCount >= 4 || toStop > 0) {
      break;
    }
  }

  return [size, l, pos];
}

export function uncompressionLZ77(data: Uint8Array) {
  const length = data.length;
  let offset = 0; // Current offset into data
  let builder = new BufferBuilder(data.length);

  while (offset < length) {
    let char = data[offset];
    offset += 1;

    if (char === 0) {
      builder.write(char);
    } else if (char <= 8) {
      for (let i = offset; i < offset + char; i++) {
        builder.write(data[i]);
      }
      offset += char;
    } else if (char <= 0x7f) {
      builder.write(char);
    } else if (char <= 0xbf) {
      let next = data[offset];
      offset += 1;
      let distance = (((char << 8) | next) >> 3) & 0x7ff;
      let lzLength = (next & 0x7) + 3;

      var bufferSize = builder.length();
      for (let i = 0; i < lzLength; i++) {
        builder.write(builder.read(bufferSize - distance));
        bufferSize += 1;
      }
    } else {
      builder.write(32);
      builder.write(char ^ 0x80);
    }
  }

  return builder;
}

const pdbHeaderSubParsers: [
  Parser<number[]>,
  Parser<number>,
  Parser<number>,
  Parser<number>,
  Parser<number>,
  Parser<number>,
  Parser<number>,
  Parser<number>,
  Parser<number>,
  Parser<number[]>,
  Parser<number[]>,
  Parser<number>,
  Parser<number>
] = [
  repeat(32, uint8()),
  uint16(),
  uint16(),
  uint32(),
  uint32(),
  uint32(),
  uint32(),
  uint32(),
  uint32(),
  repeat(4, uint8()),
  repeat(4, uint8()),
  uint32(),
  uint32(),
];

const pdbHeaderParser: Parser<PDBHeader> = map(
  sequence(pdbHeaderSubParsers),
  ([
    name,
    attr,
    version,
    ctime,
    mtime,
    btime,
    modificationNumber,
    appInfoOffset,
    sortInfoOffset,
    type,
    creator,
    uniqueId,
    nextRec,
  ]) => {
    return {
      name: bytesToString(new Uint8Array(name)),
      attr,
      version,
      ctime,
      mtime,
      btime,
      modificationNumber,
      appInfoOffset,
      sortInfoOffset,
      type: bytesToString(new Uint8Array(type)),
      creator: bytesToString(new Uint8Array(creator)),
      uniqueId,
      nextRec,
    };
  }
);

const recordListParser: Parser<Record[]> = varLen(
  "Uint16",
  map(
    sequence([uint32(), uint32()] as [Parser<number>, Parser<number>]),
    ([offset, extra]) => {
      const attr = extra & 0xff000000;
      const uniqueId = extra & 0x000000ff;

      return {
        offset,
        attr,
        uniqueId,
      };
    }
  )
);

export function palmDDCHeaderParser(records: Record[]): Parser<PalmDDCHeader> {
  const record = records[0];
  const subParsers: [
    Parser<undefined>,
    Parser<number>,
    Parser<undefined>,
    Parser<number>,
    Parser<number>,
    Parser<number>,
    Parser<number>,
    Parser<undefined>
  ] = [
    moveTo(record.offset),
    uint16(),
    skip("Uint8", 2),
    uint32(),
    uint16(),
    uint16(),
    uint16(),
    skip("Uint8", 2),
  ];

  return map(
    sequence(subParsers),
    ([
      _,
      compression,
      _skip1,
      textLength,
      recordCount,
      recordSize,
      encryptionType,
      _skip2,
    ]) => {
      return {
        compression,
        textLength,
        recordCount,
        recordSize,
        encryptionType,
      };
    }
  );
}

export const mobiHeaderSliceParser: [
  Parser<number>,
  Parser<number>,
  Parser<number>,
  Parser<number>
] = [uint32(), uint32(), uint32(), uint32()];

export const mobiHeaderSubParsers: [Parser<number>, Parser<[number, any]>] = [
  uint32(),
  pipe(uint32(), slice(sequence(mobiHeaderSliceParser))),
];

export const mobiHeaderParser = map(sequence(mobiHeaderSubParsers), () => {
  return {};
});

/*
  const startOffset = stream.offset;

  const identifier = stream.readUint32();
  const headerLength = stream.readUint32();
  const mobiType = stream.readUint32();
  const textEncoding = stream.readUint32();
  const uniqueId = stream.readUint32();
  const generatorVersion = stream.readUint32();

  stream.forward(40);

  const firstNonbookIndex = stream.readUint32();
  const fullNameOffset = stream.readUint32();
  const fullNameLength = stream.readUint32();

  const language = stream.readUint32();
  const inputLanguage = stream.readUint32();
  const outputLanguage = stream.readUint32();
  const formatVersion = stream.readUint32();
  const firstImageIdx = stream.readUint32();

  const huffRecIndex = stream.readUint32();
  const huffRecCount = stream.readUint32();
  const datpRecIndex = stream.readUint32();
  const datpRecCount = stream.readUint32();

  const exthFlags = stream.readUint32();

  stream.forward(36);

  const drmOffset = stream.readUint32();
  const drmCount = stream.readUint32();
  const drmSize = stream.readUint32();
  const drmFlags = stream.readUint32();

  stream.forward(8);

  stream.forward(4);

  stream.forward(46);

  const extraFlags = stream.readUint16();

  stream.moveTo(startOffset + headerLength);

  return {
    identifier,
    headerLength,
    mobiType,
    textEncoding,
    uniqueId,
    generatorVersion,
    firstNonbookIndex,
    fullNameOffset,
    fullNameLength,
    language,
    inputLanguage,
    outputLanguage,
    formatVersion,
    firstImageIdx,
    huffRecIndex,
    huffRecCount,
    datpRecIndex,
    datpRecCount,
    exthFlags,
    drmOffset,
    drmCount,
    drmSize,
    drmFlags,
    extraFlags,
  };*/

const mobiSubParsers: [
  Parser<PDBHeader>,
  Parser<[Record[], PalmDDCHeader]>,
  Parser<MobiHeader>
] = [
  pdbHeaderParser,
  pipe(recordListParser, palmDDCHeaderParser),
  mobiHeaderParser,
];

export const mobiParser = sequence(mobiSubParsers);

export function parse(buffer: ArrayBuffer) {
  const stream = new Stream(buffer);
  const pdbHeader = match(stream, mobiParser);
}
