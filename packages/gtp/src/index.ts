export * from "./model";
import { GtpParser } from "./gp";
import { Gtp3Parser } from "./gp3";
import { Gtp4Parser } from "./gp4";
import { Version } from "./model";
import { GtpStream } from "./stream";

export { Gtp3Parser } from "./gp3";
export { Gtp4Parser } from "./gp4";

export function parseVersion(stream: GtpStream): Version {
  const version = stream.readByteSizeString(30);

  const regexp = /(v[0-9]).([0-9]+)/gi;
  const match = regexp.exec(version);

  return {
    raw: version,
    major: match?.[1] || "",
    minor: match?.[2] || "",
  };
}

export const parsers: Record<string, GtpParser> = {
  v3: new Gtp3Parser(),
  v4: new Gtp4Parser(),
};

export function parse(buffer: ArrayBuffer) {
  const stream = new GtpStream(buffer);
  const version = parseVersion(stream);
  const parser = parsers[version.major];
  if (parser) {
    return parser.parse(stream, version);
  }
}
