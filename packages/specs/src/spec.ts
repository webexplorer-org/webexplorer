import { DataType, Stream } from "./stream";
import { Result, ok, error, isOk, isErr, mapErr } from "@webexplorer/common";

export type Parser<T> = (stream: Stream) => Result<Error, T>;

export function skip(dataType: DataType, len: number): Parser<undefined> {
  return (stream: Stream) => {
    for (let i = 0; i < len; i++) {
      stream.read(dataType);
    }

    return ok(undefined);
  };
}

export function moveTo(offset: number): Parser<undefined> {
  return (stream: Stream) => {
    stream.moveTo(offset);

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
          return mapErr(valueResult);
        }
      }

      return ok(values);
    } else {
      return mapErr(lengthResult);
    }
  };
}

export function map<U, T>(
  valueParser: Parser<U>,
  mapper: (u: U) => T
): Parser<T> {
  return (stream: Stream) => {
    const valueResult = valueParser(stream);
    if (isOk(valueResult)) {
      const value = valueResult.value;
      const mapped = mapper(value);
      return ok(mapped);
    } else {
      return mapErr(valueResult);
    }
  };
}

export function pipe<U, T>(
  prevParser: Parser<U>,
  lift: (u: U) => Parser<T>
): Parser<[U, T]> {
  return (stream: Stream) => {
    const valueResult = prevParser(stream);
    if (isOk(valueResult)) {
      const value = valueResult.value;
      const pipedResult = lift(value)(stream);
      if (isOk(pipedResult)) {
        const result: [U, T] = [valueResult.value, pipedResult.value];
        return ok(result);
      } else {
        return mapErr(pipedResult);
      }
    } else {
      return mapErr(valueResult);
    }
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
        return mapErr(result);
      }
    }

    return ok(values);
  };
}

export type SequenceParserResult<U extends readonly Parser<any>[]> =
  U extends readonly []
    ? []
    : U extends readonly [Parser<infer T>, ...infer Rest]
    ? Rest extends readonly Parser<any>[]
      ? [T, ...SequenceParserResult<Rest>]
      : never
    : never;

export function sequence<U extends readonly Parser<any>[]>(
  parsers: U
): Parser<SequenceParserResult<U>> {
  return (stream: Stream): Result<Error, SequenceParserResult<U>> => {
    const values = [];

    for (const parser of parsers) {
      const value = parser(stream);
      if (isOk(value)) {
        values.push(value.value);
      } else {
        return value;
      }
    }

    return ok(values as SequenceParserResult<U>);
  };
}

export function slice<T>(
  dataType: DataType,
  parser: Parser<T>
): Parser<readonly [number, [T, undefined]]> {
  return (stream: Stream) => {
    const offset = stream.offset;

    const lenResult = any(dataType)(stream);
    if (isOk(lenResult)) {
      const len = lenResult.value;
      const result = sequence([parser, moveTo(offset + len)] as const)(stream);
      if (isOk(result)) {
        return ok([len, result.value] as const);
      } else {
        return mapErr(result);
      }
    } else {
      return mapErr(lenResult);
    }
  };
}

export function match<T>(stream: Stream, parser: Parser<T>) {
  try {
    return parser(stream);
  } catch (e) {
    return error(e) as Result<Error, T>;
  }
}
