import { Stream } from "@webexplorer/common";

const INTEGER_START = 0x69; // 'i'
const STRING_DELIM = 0x3a; // ':'
const DICTIONARY_START = 0x64; // 'd'
const LIST_START = 0x6c; // 'l'
const END_OF_TYPE = 0x65; // 'e'
const ZERO = 0x30; // '0'
const NINE = 0x39; // 'e'
const NEGATIVE = 0x2d; // 'e'

const textDecoder = new TextDecoder();

export function decode(stream: Stream) {
  const byte = stream.peek();

  switch (byte) {
    case INTEGER_START:
      return decodeInteger(stream);
    case LIST_START:
      return decodeList(stream);
    case DICTIONARY_START:
      return decodeDictionary(stream);
    default:
      if (byte >= ZERO && byte <= NINE) {
        return decodeString(stream);
      } else {
        throw new Error(`invalid char: ${String.fromCharCode(byte)}`);
      }
  }
}

export function decodeInteger(stream: Stream) {
  const beginning = stream.readUint8();
  if (beginning !== INTEGER_START) {
    throw new Error(
      `Integer should start with i, but found ${String.fromCharCode(beginning)}`
    );
  }

  const bytes: number[] = [];
  while (!stream.isEnd()) {
    const byte = stream.readUint8();
    if (byte === END_OF_TYPE) {
      const num = parseInt(
        bytes
          .map((byte) => {
            return String.fromCharCode(byte);
          })
          .join("")
      );
      if (isNaN(num)) {
        throw new Error(`${bytes} is not a valid integer`);
      }

      return num;
    } else if (byte === NEGATIVE || (byte >= ZERO && byte <= NINE)) {
      bytes.push(byte);
    } else {
      throw new Error(
        `${String.fromCharCode(byte)} is a valid char in integer`
      );
    }
  }

  throw new Error(`Interger should end with e`);
}

export function decodeString(stream: Stream) {
  let length = 0;

  while (!stream.isEnd()) {
    const byte = stream.readUint8();
    if (byte >= ZERO && byte <= NINE) {
      length = length * 10 + byte - ZERO;
    } else if (byte === STRING_DELIM) {
      break;
    } else {
      throw new Error(
        `String length should only contains digit, but found ${String.fromCharCode(
          byte
        )}`
      );
    }
  }

  const bytes = [];
  for (let i = 0; i < length; i++) {
    if (stream.isEnd()) {
      throw new Error("found end of stream when parsing string");
    }

    const byte = stream.readUint8();
    bytes.push(byte);
  }

  return textDecoder.decode(new Uint8Array(bytes));
}

export function decodeList(stream: Stream) {
  const byte = stream.readUint8();
  if (byte !== LIST_START) {
    throw new Error(
      `list should start with l, but found ${String.fromCharCode(byte)}`
    );
  }

  const next = stream.peek();
  if (next === END_OF_TYPE) {
    stream.forward(1);
    return [];
  }

  const list: any[] = [];
  while (!stream.isEnd()) {
    const item = decode(stream);
    list.push(item);

    const next = stream.peek();
    if (next === END_OF_TYPE) {
      stream.forward(1);
      return list;
    }
  }

  const end = stream.readUint8();
  throw new Error(
    `list should end with e, but found ${String.fromCharCode(end)}`
  );
}

export function decodeDictionary(stream: Stream) {
  const byte = stream.readUint8();
  if (byte !== DICTIONARY_START) {
    throw new Error(
      `dictionary should start with d, but found ${String.fromCharCode(byte)}`
    );
  }

  const next = stream.peek();
  if (next === END_OF_TYPE) {
    stream.forward(1);
    return {};
  }

  const obj: Record<any, any> = {};
  while (!stream.isEnd()) {
    const key = decode(stream);
    const value = decode(stream);
    obj[key.toString()] = value;

    const next = stream.peek();
    if (next === END_OF_TYPE) {
      stream.forward(1);
      return obj;
    }
  }

  const end = stream.readUint8();
  throw new Error(
    `dictionary should end with e, but found ${String.fromCharCode(end)}`
  );
}
