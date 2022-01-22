import {
  Stream,
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
  repeat,
} from "@webexplorer/specs";
import {
  BufferBuilder,
  bytesToString,
  ok,
  isOk,
  mapErr,
  Result,
} from "@webexplorer/common";

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

const pdbHeaderParser: Parser<PDBHeader> = map(
  sequence([
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
  ] as const),
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

export const palmDDCHeaderParser: Parser<PalmDDCHeader> = map(
  sequence([
    uint16(),
    skip("Uint8", 2),
    uint32(),
    uint16(),
    uint16(),
    uint16(),
    skip("Uint8", 2),
  ] as const),
  ([
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

export const mobiHeaderParser: Parser<MobiHeader> = map(
  sequence([
    uint32(),
    slice(
      "Uint32",
      sequence([
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        skip("Uint8", 40),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        skip("Uint8", 36),
        uint32(),
        uint32(),
        uint32(),
        uint32(),
        skip("Uint8", 8),
        skip("Uint8", 8),
        skip("Uint8", 46),
        uint16(),
      ] as const)
    ),
  ] as const),
  ([
    identifier,
    [
      headerLength,
      [
        [
          mobiType,
          textEncoding,
          uniqueId,
          generatorVersion,
          _skip1,
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
          _skip2,
          drmOffset,
          drmCount,
          drmSize,
          drmFlags,
          _skip3,
          _skip4,
          _skip5,
          extraFlags,
        ],
        undefined,
      ],
    ],
  ]) => {
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
      extraFlags,
      drmOffset,
      drmCount,
      drmSize,
      drmFlags,
      exthFlags,
    };
  }
);

export const mobiMetadataParser: Parser<MobiMetadata> = map(
  sequence([
    pdbHeaderParser,
    pipe(recordListParser, (records) => {
      const record = records[0];
      return sequence([moveTo(record.offset), palmDDCHeaderParser] as const);
    }),
    mobiHeaderParser,
  ] as const),
  ([pdbHeader, [recordList, [_skip, palmDDCHeader]], mobiHeader]) => {
    return {
      pdbHeader,
      recordList,
      palmDDCHeader,
      mobiHeader,
    };
  }
);

export const mobiParser = pipe(mobiMetadataParser, (metadata) => {
  return (stream: Stream) => {
    const text = readText(stream, metadata);

    return ok(text);
  };
});

export function parse(buffer: ArrayBuffer): Result<Error, Mobi> {
  const stream = new Stream(buffer);
  const result = match(stream, mobiParser);
  if (isOk(result)) {
    const [metadata, text] = result.value;
    const mobi: Mobi = { metadata, text };

    return ok(mobi);
  } else {
    return mapErr(result);
  }
}
