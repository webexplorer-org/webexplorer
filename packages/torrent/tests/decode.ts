import { Stream } from "@webexplorer/common";
import {
  decodeInteger,
  decodeString,
  decodeList,
  decodeDictionary,
} from "../src/decode";
import test from "tape";

const textEncoder = new TextEncoder();

test("decodeInteger should return integer for valid input", (t) => {
  const array = textEncoder.encode("i10000e");
  const stream = new Stream(array.buffer);
  const num = decodeInteger(stream);
  t.equal(num, 10000);
  t.end();
});

test("decodeInteger should return negative integer for valid input", (t) => {
  const array = textEncoder.encode("i-10000e");
  const stream = new Stream(array.buffer);
  const num = decodeInteger(stream);
  t.equal(num, -10000);
  t.end();
});

test("decodeInteger should throw exception for invalid beginning", (t) => {
  const array = textEncoder.encode("10000e");
  const stream = new Stream(array.buffer);
  t.throws(() => {
    decodeInteger(stream);
  }, /Integer should start with i, but found 1/);
  t.end();
});

test("decodeInteger should throw exception for invalid ending", (t) => {
  const array = textEncoder.encode("i10000");
  const stream = new Stream(array.buffer);
  t.throws(() => {
    decodeInteger(stream);
  }, /Interger should end with e/);
  t.end();
});

test("decodeInteger should throw exception for invalid ending", (t) => {
  const array = textEncoder.encode("i10000m");
  const stream = new Stream(array.buffer);
  t.throws(() => {
    decodeInteger(stream);
  }, /m is a valid char in integer/);
  t.end();
});

test("decodeString should return string for valid input", (t) => {
  const array = textEncoder.encode("1:e");
  const stream = new Stream(array.buffer);
  const str = decodeString(stream);
  t.equal(str, "e");
  t.end();
});

test("decodeString should return string for valid input", (t) => {
  const array = textEncoder.encode("0:");
  const stream = new Stream(array.buffer);
  const str = decodeString(stream);
  t.equal(str, "");
  t.end();
});

test("decodeString should throw exception for invalid input", (t) => {
  const array = textEncoder.encode("100:ma");
  const stream = new Stream(array.buffer);
  t.throws(() => {
    decodeString(stream);
  }, /found end of stream when parsing string/);
  t.end();
});

test("decodeList should empty list for le", (t) => {
  const array = textEncoder.encode("le");
  const stream = new Stream(array.buffer);
  const list = decodeList(stream);
  t.deepEqual(list, []);
  t.end();
});

test("decodeList should throw exception for invalid beginning", (t) => {
  const array = textEncoder.encode("i10000e");
  const stream = new Stream(array.buffer);
  t.throws(() => {
    decodeList(stream);
  }, /list should start with l, but found i/);
  t.end();
});

test("decodeList should throw exception for invalid ending", (t) => {
  const array = textEncoder.encode("l10000");
  const stream = new Stream(array.buffer);
  t.throws(() => {
    decodeList(stream);
  }, /found end of stream when parsing string/);
  t.end();
});

test("decodeList should return list for valid input", (t) => {
  const array = textEncoder.encode("li10000ee");
  const stream = new Stream(array.buffer);
  const list = decodeList(stream);
  t.deepEqual(list, [10000]);
  t.end();
});

test("decodeDictionary should empty list for de", (t) => {
  const array = textEncoder.encode("de");
  const stream = new Stream(array.buffer);
  const list = decodeDictionary(stream);
  t.deepEqual(list, {});
  t.end();
});

test("decodeDictionary should throw exception for invalid beginning", (t) => {
  const array = textEncoder.encode("i10000e");
  const stream = new Stream(array.buffer);
  t.throws(() => {
    decodeDictionary(stream);
  }, /dictionary should start with d, but found i/);
  t.end();
});

test("decodeDictionary should throw exception for invalid ending", (t) => {
  const array = textEncoder.encode("d10000");
  const stream = new Stream(array.buffer);
  t.throws(() => {
    decodeDictionary(stream);
  }, /found end of stream when parsing string/);
  t.end();
});

test("decodeDictionary should return list for valid input", (t) => {
  const array = textEncoder.encode("d5:valuei10000ee");
  const stream = new Stream(array.buffer);
  const dict = decodeDictionary(stream);
  t.deepEqual(dict, { value: 10000 });
  t.end();
});
