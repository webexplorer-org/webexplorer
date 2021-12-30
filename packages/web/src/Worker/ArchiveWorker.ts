import { init, ArchiveModule } from "@webexplorer/archive";
// @ts-ignore
import wasmUrl from "@webexplorer/archive/src/libarchive.wasm";
import * as comlink from "comlink";

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
  name: string;
  size: number;
  path: string;
  type: number;
};

export class ArchiveWorker {
  module: ArchiveModule | undefined;
  filePtr: number | null = null;
  fileLength: number = 0;
  passphrase: string | null = null;
  archive: number | null = null;

  async init() {
    this.module = await init({
      locateFile: () => {
        return wasmUrl;
      },
    });
  }

  getModule(): ArchiveModule {
    if (!this.module) {
      throw new Error("module is not initialized yet");
    }

    return this.module;
  }

  async open(file: File, passphrase: string | null) {
    if (!this.filePtr) {
      this.close();
    }

    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const module = this.getModule();

    const array = new Int8Array(buffer);
    const fileLength = array.length;
    const filePtr = module.malloc(fileLength);
    module.HEAP8.set(array, filePtr);

    this.filePtr = filePtr;
    this.fileLength = fileLength;
    this.passphrase = passphrase;

    this.archive = module.open(this.filePtr, this.fileLength, this.passphrase);
  }

  async close() {
    if (this.filePtr) {
      const module = this.getModule();

      module.close(this.archive);
      this.archive = null;

      module.free(this.filePtr);
      this.filePtr = null;
    }
  }

  entries(skipExtraction = true) {
    const module = this.getModule();

    const archive = module.open(this.filePtr, this.fileLength, this.passphrase);

    const entries: ArchiveEntry[] = [];

    while (true) {
      let entryPtr = module.readNextEntry(archive);
      if (entryPtr === 0) {
        break;
      }

      const size = module.getEntrySize(entryPtr);
      const path = module.getEntryPathName(entryPtr);
      const type = module.getEntryFileType(entryPtr) as keyof typeof TYPE_MAP;

      let name = "";
      if (TYPE_MAP[type] === "FILE") {
        let parts = path.split("/");
        name = parts[parts.length - 1];
      }

      module.readDataSkip(archive);

      const entry = {
        name,
        size,
        path,
        type,
      };

      entries.push(entry);
    }

    return entries;
  }
}

export const worker = new ArchiveWorker();

comlink.expose(worker);
