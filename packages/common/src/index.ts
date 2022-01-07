export class BufferBuilder {
  fragmentSize: number;
  fragmentIndex: number = 0;
  fragmentOffset: number = 0;
  fragments: Uint8Array[] = [];

  constructor(fragmentSize: number) {
    this.fragmentSize = fragmentSize;
    this.extend();
  }

  extend() {
    const fragment = new Uint8Array(this.fragmentSize);
    this.fragments.push(fragment);
    this.fragmentIndex = this.fragments.length - 1;
    this.fragmentOffset = 0;
  }

  write(byte: number) {
    if (this.fragmentOffset === this.fragmentSize) {
      this.extend();
    }

    this.fragments[this.fragmentIndex][this.fragmentOffset] = byte;
    this.fragmentOffset = this.fragmentOffset + 1;
  }

  read(offset: number) {
    const fragmentIndex = Math.floor(offset / this.fragmentSize);
    const fragmentOffset = offset - fragmentIndex * this.fragmentSize;
    return this.fragments[fragmentIndex][fragmentOffset];
  }

  length() {
    const length =
      (this.fragments.length - 1) * this.fragmentSize + this.fragmentOffset;

    return length;
  }

  combine() {
    if (this.fragments.length == 0) {
      return new Uint8Array(0);
    }

    const length = this.length();
    const array = new Uint8Array(length);

    let offset = 0;
    this.fragments.forEach((buffer, i) => {
      if (i !== this.fragments.length - 1) {
        array.set(buffer, offset);
        offset += buffer.length;
      } else {
        array.set(buffer.slice(0, this.fragmentOffset), offset);
      }
    });

    return array;
  }
}

export class Stream {
  offset: number;
  view: DataView;

  constructor(arrayBuffer: ArrayBuffer) {
    const view = new DataView(arrayBuffer);
    this.view = view;
    this.offset = 0;
  }

  readByte() {
    const byte = this.view.getInt8(this.offset);
    this.offset = this.offset + 1;
    return byte;
  }

  readUByte() {
    const u8 = this.view.getUint8(this.offset);
    this.offset = this.offset + 1;
    return u8;
  }

  readBytes(len: number) {
    const { view, offset } = this;
    const data = view.buffer.slice(offset, offset + len);
    this.offset = this.offset + len;
    return new Uint8Array(data);
  }

  readUint8() {
    const u8 = this.view.getUint8(this.offset);
    this.offset = this.offset + 1;
    return u8;
  }

  readUint16(littleEndian: boolean = false) {
    const u16 = this.view.getUint16(this.offset, littleEndian);
    this.offset = this.offset + 2;
    return u16;
  }

  readUint32(littleEndian: boolean = false) {
    const u32 = this.view.getUint32(this.offset, littleEndian);
    this.offset = this.offset + 4;
    return u32;
  }

  readInt8() {
    const u8 = this.view.getInt8(this.offset);
    this.offset = this.offset + 1;
    return u8;
  }

  readInt16(littleEndian: boolean = false) {
    const u16 = this.view.getInt16(this.offset, littleEndian);
    this.offset = this.offset + 2;
    return u16;
  }

  readInt32(littleEndian: boolean = false) {
    const u32 = this.view.getInt32(this.offset, littleEndian);
    this.offset = this.offset + 4;
    return u32;
  }

  forward(len: number) {
    this.offset = this.offset + len;
  }

  moveTo(offset: number) {
    this.offset = offset;
  }
}

export function bytesToString(bytes: Uint8Array) {
  return new TextDecoder("utf-8").decode(bytes);
}
