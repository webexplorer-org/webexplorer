import { DataType, Stream } from "./stream";

export interface Ok<T> {
  kind: "ok";
  value: T;
}

export interface Err<E> {
  kind: "error";
  value: E;
}

type Result<E, T> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return {
    kind: "ok",
    value,
  };
}

export function isOk<E, T>(result: Result<E, T>): result is Ok<T> {
  return result.kind === "ok";
}

export function error<E>(value: E): Err<E> {
  return {
    kind: "error",
    value,
  };
}

export type Parser<T> = (stream: Stream) => Result<Error, T>;

export function ignore(): Parser<undefined> {
  return (stream: Stream) => {
    return ok(undefined);
  };
}

export function any(dataType: DataType): Parser<number> {
  return (stream: Stream) => {
    const num = stream[`read${dataType}`]();
    return ok(num);
  };
}

export function uint8() {
  return any("Uint8");
}

export function uint16() {
  return any("Uint16");
}

export function uint32() {
  return any("Uint32");
}

export function int8() {
  return any("Int8");
}

export function int16() {
  return any("Int16");
}

export function int32() {
  return any("Int32");
}

export function constant<
  T extends
    | Uint8Array
    | Uint16Array
    | Uint32Array
    | Int8Array
    | Int16Array
    | Int32Array
>(expected: T, dataType: DataType): Parser<T> {
  return (stream: Stream) => {
    for (let i = 0; i < expected.length; i++) {
      const actual = stream.read(dataType);
      if (actual !== expected[i]) {
        return error(new Error(`expected ${expected[i]}, but found ${actual}`));
      }
    }

    return ok(expected);
  };
}

export function repeat<T>(count: number, parser: Parser<T>): Parser<T[]> {
  return (stream: Stream) => {
    const values: T[] = [];

    for (let i = 0; i < count; i++) {
      const result = parser(stream);
      if (isOk(result)) {
        values.push(result.value);
      } else {
        const err: Result<Error, T> = error(result.value);
        return err;
      }
    }

    return ok(values);
  };
}

export function varLen<T>(
  lengthDataType: DataType,
  parser: Parser<T>
): Parser<T[]> {
  const lengthParser = any(lengthDataType);

  return (stream: Stream) => {
    const lengthResult = lengthParser(stream);
    if (isOk(lengthResult)) {
      const len = lengthResult.value;

      const values: T[] = [];
      for (let i = 0; i < len; i++) {
        const valueResult = parser(stream);
        if (isOk(valueResult)) {
          values.push(valueResult.value);
        } else {
          const err: Result<Error, T[]> = error(valueResult.value);
          return err;
        }
      }

      return ok(values);
    } else {
      const err: Result<Error, T[]> = error(lengthResult.value);
      return err;
    }
  };
}

export function map<U, T>(
  valueParser: Parser<U>,
  mapper: (u: U) => Parser<T>
): Parser<T> {
  return (stream: Stream) => {
    const valueResult = valueParser(stream);
    if (isOk(valueResult)) {
      const value = valueResult.value;
      const parser = mapper(value);
      return parser(stream);
    } else {
      const err: Result<Error, T[]> = error(valueResult.value);
      return err;
    }
  };
}

export type SequenceParserResult<U extends any[]> = U extends []
  ? []
  : U extends [Parser<infer T>]
  ? [T]
  : U extends [Parser<infer T>, ...infer Rest]
  ? [T, ...SequenceParserResult<Rest>]
  : [];

export function sequence<U extends Array<Parser<any>>>(
  parsers: U
): Parser<SequenceParserResult<U>> {
  return (stream: Stream): Result<Error, SequenceParserResult<U>> => {
    const values = [] as SequenceParserResult<U>;

    for (const parser of parsers) {
      const value = parser(stream);
      if (isOk(value)) {
        // @ts-ignore
        values.push(value);
      } else {
        return value;
      }
    }

    return ok(values);
  };
}

export function parser<T>(stream: Stream, parser: Parser<T>) {
  try {
    return parser(stream);
  } catch (e) {
    return error(e);
  }
}
