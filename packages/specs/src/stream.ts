export type DataType =
  | "Uint8"
  | "Uint16"
  | "Uint32"
  | "Int8"
  | "Int16"
  | "Int32";

export class Stream {
  offset: number;
  view: DataView;

  constructor(arrayBuffer: ArrayBuffer, private isLittleEndian = false) {
    const view = new DataView(arrayBuffer);
    this.view = view;
    this.offset = 0;
  }

  readUint8() {
    const u8 = this.view.getUint8(this.offset);
    this.offset = this.offset + 1;
    return u8;
  }

  readUint16(littleEndian: boolean = false) {
    const u16 = this.view.getUint16(
      this.offset,
      littleEndian || this.isLittleEndian
    );
    this.offset = this.offset + 2;
    return u16;
  }

  readUint32(littleEndian: boolean = false) {
    const u32 = this.view.getUint32(
      this.offset,
      littleEndian || this.isLittleEndian
    );
    this.offset = this.offset + 4;
    return u32;
  }

  readInt8() {
    const u8 = this.view.getInt8(this.offset);
    this.offset = this.offset + 1;
    return u8;
  }

  readInt16(littleEndian: boolean = false) {
    const u16 = this.view.getInt16(
      this.offset,
      littleEndian || this.isLittleEndian
    );
    this.offset = this.offset + 2;
    return u16;
  }

  readInt32(littleEndian: boolean = false) {
    const u32 = this.view.getInt32(
      this.offset,
      littleEndian || this.isLittleEndian
    );
    this.offset = this.offset + 4;
    return u32;
  }

  read(dataType: DataType) {
    return this[`read${dataType}`]();
  }

  peek() {
    return this.view.getUint8(this.offset);
  }

  forward(len: number) {
    this.offset = this.offset + len;
  }

  moveTo(offset: number) {
    this.offset = offset;
  }
}
