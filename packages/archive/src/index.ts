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
    getError: module.cwrap("_archive_error_string", "string", [
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

const TYPE_MAP = {
  32768: "FILE",
  16384: "DIR",
  40960: "SYMBOLIC_LINK",
  49152: "SOCKET",
  8192: "CHARACTER_DEVICE",
  24576: "BLOCK_DEVICE",
  4096: "NAMED_PIPE",
};

export type ArchiveEntry = {
  ptr: number;
  name: string;
  size: number;
  path: string;
  type: number;
  data: Int8Array | undefined;
};

export async function unarchive(
  module: ArchiveModule,
  filePtr: number,
  fileLength: number,
  passphrase: string | null,
  skipExtraction: boolean = true
) {
  const archive = module.open(filePtr, fileLength, passphrase);

  const entries: ArchiveEntry[] = [];

  while (true) {
    let ptr = module.readNextEntry(archive);
    if (ptr === 0) {
      break;
    }

    const size = module.getEntrySize(ptr);
    const path = module.getEntryPathName(ptr);
    const type = module.getEntryFileType(ptr) as keyof typeof TYPE_MAP;

    let name = "";
    if (TYPE_MAP[type] === "FILE") {
      let parts = path.split("/");
      name = parts[parts.length - 1];
    }

    let data: Int8Array | undefined = undefined;
    if (skipExtraction) {
      module.readDataSkip(archive);
    } else {
      const ptr = module.malloc(size);
      module.readData(archive, ptr, size);
      data = module.HEAP8.slice(ptr, ptr + size);
      module.free(ptr);
    }

    const entry = {
      ptr,
      name,
      size,
      path,
      type,
      data,
    };

    entries.push(entry);
  }

  module.close(archive);

  return entries;
}
