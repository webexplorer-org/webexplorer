import { BufferBuilder, Stream, bytesToString } from "@webexplorer/common";

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
  uniquiId: number;
  nextRec: number;
  recordNum: number;
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

export function parse(buffer: ArrayBuffer): Mobi {
  const stream = new Stream(buffer);
  const pdbHeader = parsePDBHeader(stream);
  const recordList = parseRecordList(stream, pdbHeader.recordNum);
  const palmDDCHeader = parsePalmDDCHeader(stream, recordList[0]);
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

export function parsePDBHeader(stream: Stream): PDBHeader {
  const name = stream.readBytes(32);
  const attr = stream.readUint16();
  const version = stream.readUint16();
  const ctime = stream.readUint32();
  const mtime = stream.readUint32();
  const btime = stream.readUint32();
  const modificationNumber = stream.readUint32();
  const appInfoOffset = stream.readUint32();
  const sortInfoOffset = stream.readUint32();
  const type = stream.readBytes(4);
  const creator = stream.readBytes(4);
  const uniquiId = stream.readUint32();
  const nextRec = stream.readUint32();
  const recordNum = stream.readUint16();

  return {
    name: bytesToString(name),
    attr,
    version,
    ctime,
    mtime,
    btime,
    modificationNumber,
    appInfoOffset,
    sortInfoOffset,
    type: bytesToString(type),
    creator: bytesToString(creator),
    uniquiId,
    nextRec,
    recordNum,
  };
}

export function parseRecordList(stream: Stream, num: number) {
  const recordList: Record[] = [];

  for (let i = 0; i < num; i++) {
    const offset = stream.readUint32();
    const extra = stream.readUint32();
    const attr = extra & 0xff000000;
    const uniqueId = extra & 0x000000ff;

    recordList.push({
      offset,
      attr,
      uniqueId,
    });
  }

  return recordList;
}

export function parsePalmDDCHeader(stream: Stream, record: Record) {
  stream.moveTo(record.offset);

  const compression = stream.readUint16();
  stream.forward(2);
  const textLength = stream.readUint32();
  const recordCount = stream.readUint16();
  const recordSize = stream.readUint16();
  const encryptionType = stream.readUint16();
  stream.forward(2);

  return {
    compression,
    textLength,
    recordCount,
    recordSize,
    encryptionType,
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
  console.log(data.byteLength, data[0], data[data.byteLength - 1]);

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
    console.log(data.byteLength, data[0], data[data.byteLength - 1]);
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
