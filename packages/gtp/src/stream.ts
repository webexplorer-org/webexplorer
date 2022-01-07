import { Stream, bytesToString } from "@webexplorer/common";

export class GtpStream extends Stream {
  readBool(): boolean {
    const byte = this.readInt8();
    return !!(byte & 0xff);
  }

  readString(size: number, length?: number) {
    if (length === undefined) {
      length = size;
    }

    const count = size > 0 ? size : length;
    return bytesToString(this.readBytes(count).slice(0, length));
  }

  readByteSizeString(size: number) {
    const byte = this.readInt8();
    return this.readString(size, byte);
  }

  readIntSizeString() {
    const len = this.readInt32(true);
    return this.readString(len);
  }

  readIntByteSizeString() {
    const len = this.readInt32(true) - 1;
    return this.readByteSizeString(len);
  }
}
