"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bytesToString = exports.Stream = exports.BufferBuilder = void 0;
class BufferBuilder {
    constructor(fragmentSize) {
        this.fragmentIndex = 0;
        this.fragmentOffset = 0;
        this.fragments = [];
        this.fragmentSize = fragmentSize;
        this.extend();
    }
    extend() {
        const fragment = new Uint8Array(this.fragmentSize);
        this.fragments.push(fragment);
        this.fragmentIndex = this.fragments.length - 1;
        this.fragmentOffset = 0;
    }
    write(byte) {
        if (this.fragmentOffset === this.fragmentSize) {
            this.extend();
        }
        this.fragments[this.fragmentIndex][this.fragmentOffset] = byte;
        this.fragmentOffset = this.fragmentOffset + 1;
    }
    read(offset) {
        const fragmentIndex = Math.floor(offset / this.fragmentSize);
        const fragmentOffset = offset - fragmentIndex * this.fragmentSize;
        return this.fragments[fragmentIndex][fragmentOffset];
    }
    length() {
        const length = (this.fragments.length - 1) * this.fragmentSize + this.fragmentOffset;
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
            }
            else {
                array.set(buffer.slice(0, this.fragmentOffset), offset);
            }
        });
        return array;
    }
}
exports.BufferBuilder = BufferBuilder;
class Stream {
    constructor(arrayBuffer) {
        const view = new DataView(arrayBuffer);
        this.view = view;
        this.offset = 0;
    }
    readBytes(len) {
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
    readUint16(littleEndian = false) {
        const u16 = this.view.getUint16(this.offset, littleEndian);
        this.offset = this.offset + 2;
        return u16;
    }
    readUint32(littleEndian = false) {
        const u32 = this.view.getUint32(this.offset, littleEndian);
        this.offset = this.offset + 4;
        return u32;
    }
    forward(len) {
        this.offset = this.offset + len;
    }
    moveTo(offset) {
        this.offset = offset;
    }
}
exports.Stream = Stream;
function bytesToString(bytes) {
    return new TextDecoder("utf-8").decode(bytes);
}
exports.bytesToString = bytesToString;
