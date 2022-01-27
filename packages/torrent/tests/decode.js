"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@webexplorer/common");
const decode_1 = require("../src/decode");
const tape_1 = __importDefault(require("tape"));
const textEncoder = new TextEncoder();
(0, tape_1.default)("decodeInteger should return integer for valid input", (t) => {
    const array = textEncoder.encode("i10000e");
    const stream = new common_1.Stream(array.buffer);
    const num = (0, decode_1.decodeInteger)(stream);
    t.equal(num, 10000);
    t.end();
});
(0, tape_1.default)("decodeInteger should return negative integer for valid input", (t) => {
    const array = textEncoder.encode("i-10000e");
    const stream = new common_1.Stream(array.buffer);
    const num = (0, decode_1.decodeInteger)(stream);
    t.equal(num, -10000);
    t.end();
});
(0, tape_1.default)("decodeInteger should throw exception for invalid beginning", (t) => {
    const array = textEncoder.encode("10000e");
    const stream = new common_1.Stream(array.buffer);
    t.throws(() => {
        (0, decode_1.decodeInteger)(stream);
    }, /Integer should start with i, but found 1/);
    t.end();
});
(0, tape_1.default)("decodeInteger should throw exception for invalid ending", (t) => {
    const array = textEncoder.encode("i10000");
    const stream = new common_1.Stream(array.buffer);
    t.throws(() => {
        (0, decode_1.decodeInteger)(stream);
    }, /Interger should end with e/);
    t.end();
});
(0, tape_1.default)("decodeInteger should throw exception for invalid ending", (t) => {
    const array = textEncoder.encode("i10000m");
    const stream = new common_1.Stream(array.buffer);
    t.throws(() => {
        (0, decode_1.decodeInteger)(stream);
    }, /m is a valid char in integer/);
    t.end();
});
(0, tape_1.default)("decodeString should return string for valid input", (t) => {
    const array = textEncoder.encode("1:e");
    const stream = new common_1.Stream(array.buffer);
    const str = (0, decode_1.decodeString)(stream);
    t.equal(str, "e");
    t.end();
});
(0, tape_1.default)("decodeString should return string for valid input", (t) => {
    const array = textEncoder.encode("0:");
    const stream = new common_1.Stream(array.buffer);
    const str = (0, decode_1.decodeString)(stream);
    t.equal(str, "");
    t.end();
});
(0, tape_1.default)("decodeString should throw exception for invalid input", (t) => {
    const array = textEncoder.encode("100:ma");
    const stream = new common_1.Stream(array.buffer);
    t.throws(() => {
        (0, decode_1.decodeString)(stream);
    }, /found end of stream when parsing string/);
    t.end();
});
(0, tape_1.default)("decodeList should empty list for le", (t) => {
    const array = textEncoder.encode("le");
    const stream = new common_1.Stream(array.buffer);
    const list = (0, decode_1.decodeList)(stream);
    t.deepEqual(list, []);
    t.end();
});
(0, tape_1.default)("decodeList should throw exception for invalid beginning", (t) => {
    const array = textEncoder.encode("i10000e");
    const stream = new common_1.Stream(array.buffer);
    t.throws(() => {
        (0, decode_1.decodeList)(stream);
    }, /list should start with l, but found i/);
    t.end();
});
(0, tape_1.default)("decodeList should throw exception for invalid ending", (t) => {
    const array = textEncoder.encode("l10000");
    const stream = new common_1.Stream(array.buffer);
    t.throws(() => {
        (0, decode_1.decodeList)(stream);
    }, /found end of stream when parsing string/);
    t.end();
});
(0, tape_1.default)("decodeList should return list for valid input", (t) => {
    const array = textEncoder.encode("li10000ee");
    const stream = new common_1.Stream(array.buffer);
    const list = (0, decode_1.decodeList)(stream);
    t.deepEqual(list, [10000]);
    t.end();
});
(0, tape_1.default)("decodeDictionary should empty list for de", (t) => {
    const array = textEncoder.encode("de");
    const stream = new common_1.Stream(array.buffer);
    const list = (0, decode_1.decodeDictionary)(stream);
    t.deepEqual(list, {});
    t.end();
});
(0, tape_1.default)("decodeDictionary should throw exception for invalid beginning", (t) => {
    const array = textEncoder.encode("i10000e");
    const stream = new common_1.Stream(array.buffer);
    t.throws(() => {
        (0, decode_1.decodeDictionary)(stream);
    }, /dictionary should start with d, but found i/);
    t.end();
});
(0, tape_1.default)("decodeDictionary should throw exception for invalid ending", (t) => {
    const array = textEncoder.encode("d10000");
    const stream = new common_1.Stream(array.buffer);
    t.throws(() => {
        (0, decode_1.decodeDictionary)(stream);
    }, /found end of stream when parsing string/);
    t.end();
});
(0, tape_1.default)("decodeDictionary should return list for valid input", (t) => {
    const array = textEncoder.encode("d5:valuei10000ee");
    const stream = new common_1.Stream(array.buffer);
    const dict = (0, decode_1.decodeDictionary)(stream);
    t.deepEqual(dict, { value: 10000 });
    t.end();
});
