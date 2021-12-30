import libarchive, { LibArchiveModule } from "./libarchive";

export type ArchiveModule = ReturnType<typeof wrap>;

export function wrap(module: LibArchiveModule) {
  return {
    HEAP8: module.HEAP8,
    open: module.cwrap("archive_open", "number", [
      "number",
      "number",
      "string",
    ] as const),
    close: module.cwrap("archive_close", null, ["number"] as const),
    readNextEntry: module.cwrap("archive_read_next_entry", "number", [
      "number",
    ] as const),
    readData: module.cwrap("archive_read_data", "number", [
      "number",
      "number",
      "number",
    ] as const),
    readDataSkip: module.cwrap("archive_read_data_skip", "number", [
      "number",
    ] as const),
    addPasphrase: module.cwrap("archive_read_add_passphrase", "number", [
      "number",
      "string",
    ]),
    getError: module.cwrap("_archive_error_string", "number", [
      "number",
      "number",
      "number",
    ] as const),
    getEntrySize: module.cwrap("archive_entry_size", "number", [
      "number",
    ] as const),
    getEntryFileType: module.cwrap("archive_entry_filetype", "number", [
      "number",
    ] as const),
    getEntryPathName: module.cwrap("archive_entry_pathname_utf8", "string", [
      "number",
    ] as const),
    malloc: module.cwrap("malloc", "number", ["number"] as const),
    free: module.cwrap("free", null, ["number"] as const),
  };
}

export async function init(options?: {
  locateFile?: (path: string, prefix: string) => string;
}) {
  const module = await libarchive(options);

  return wrap(module);
}
