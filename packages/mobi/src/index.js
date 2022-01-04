"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uncompressionLZ77 = exports.getVarLen = exports.readTextRecord = exports.readText = exports.parseMobiHeader = exports.parsePalmDDCHeader = exports.parseRecordList = exports.parsePDBHeader = exports.parse = exports.EncryptionType = exports.Compression = void 0;
const common_1 = require("@webexplorer/common");
// https://github.com/kovidgoyal/calibre/blob/master/format_docs/pdb/mobi.txt
var Compression;
(function (Compression) {
    Compression[Compression["NoCompression"] = 1] = "NoCompression";
    Compression[Compression["PalmDDC"] = 2] = "PalmDDC";
    Compression[Compression["HuffCDIC"] = 17480] = "HuffCDIC";
})(Compression = exports.Compression || (exports.Compression = {}));
var EncryptionType;
(function (EncryptionType) {
    EncryptionType[EncryptionType["NoEncryption"] = 0] = "NoEncryption";
    EncryptionType[EncryptionType["OldMobipocket"] = 1] = "OldMobipocket";
    EncryptionType[EncryptionType["MobipocketEncryption"] = 2] = "MobipocketEncryption";
})(EncryptionType = exports.EncryptionType || (exports.EncryptionType = {}));
function parse(buffer) {
    const stream = new common_1.Stream(buffer);
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
exports.parse = parse;
function parsePDBHeader(stream) {
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
        name: (0, common_1.bytesToString)(name),
        attr,
        version,
        ctime,
        mtime,
        btime,
        modificationNumber,
        appInfoOffset,
        sortInfoOffset,
        type: (0, common_1.bytesToString)(type),
        creator: (0, common_1.bytesToString)(creator),
        uniquiId,
        nextRec,
        recordNum,
    };
}
exports.parsePDBHeader = parsePDBHeader;
function parseRecordList(stream, num) {
    const recordList = [];
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
exports.parseRecordList = parseRecordList;
function parsePalmDDCHeader(stream, record) {
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
exports.parsePalmDDCHeader = parsePalmDDCHeader;
function parseMobiHeader(stream) {
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
exports.parseMobiHeader = parseMobiHeader;
function readText(stream, metadata) {
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
exports.readText = readText;
function readTextRecord(stream, metadata, index) {
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
    }
    else {
        return data;
    }
}
exports.readTextRecord = readTextRecord;
function getVarLen(data, pos) {
    let l = 0;
    let size = 0;
    let byteCount = 0;
    let mask = 0x7f;
    let stopFlag = 0x80;
    let shift = 0;
    for (let i = 0;; i++) {
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
exports.getVarLen = getVarLen;
function uncompressionLZ77(data) {
    const length = data.length;
    let offset = 0; // Current offset into data
    let builder = new common_1.BufferBuilder(data.length);
    while (offset < length) {
        let char = data[offset];
        offset += 1;
        if (char === 0) {
            builder.write(char);
        }
        else if (char <= 8) {
            for (let i = offset; i < offset + char; i++) {
                builder.write(data[i]);
            }
            offset += char;
        }
        else if (char <= 0x7f) {
            builder.write(char);
        }
        else if (char <= 0xbf) {
            let next = data[offset];
            offset += 1;
            let distance = (((char << 8) | next) >> 3) & 0x7ff;
            let lzLength = (next & 0x7) + 3;
            var bufferSize = builder.length();
            for (let i = 0; i < lzLength; i++) {
                builder.write(builder.read(bufferSize - distance));
                bufferSize += 1;
            }
        }
        else {
            builder.write(32);
            builder.write(char ^ 0x80);
        }
    }
    return builder;
}
exports.uncompressionLZ77 = uncompressionLZ77;
