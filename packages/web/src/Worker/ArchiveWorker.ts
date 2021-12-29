import { libarchive, ArchiveModule } from "@webexplorer/archive";
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

export class ArchiveWorker {
  module: ArchiveModule | undefined;
  filePtr: number | undefined;
  fileLength: number | undefined;
  passphrase: string | undefined;

  async init() {
    this.module = await libarchive({
      locateFile: () => {
        return wasmUrl;
      },
      onRuntimeInitialized() {
        // Delete the `then` prop to avoid infite loop
        // when use the returned module as a promise rather than call its then() method
        // See https://github.com/emscripten-core/emscripten/issues/5820
        // tslint:disable-next-line: prefer-type-cast
        delete (this.module as any).then;
      },
    });
  }

  getModule(): ArchiveModule {
    if (!this.module) {
      throw new Error("module is not initialized yet");
    }

    return this.module;
  }

  async open(file: File) {
    const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as ArrayBuffer);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });

    const module = this.getModule();
    const array = new Uint8Array(buffer);
    this.fileLength = array.length;
    this.filePtr = module._malloc(this.fileLength);
  }

  *entries(skipExtraction = false) {
    const module = this.getModule();

    const archive = module._archive_open(
      this.filePtr,
      this.fileLength,
      this.passphrase
    );
    let entry;

    while (true) {
      entry = module._get_next_entry(archive);
      if (entry === 0) break;

      const entryData = {
        size: module._get_entry_size(entry),
        path: module._get_entry_name(entry),
        //@ts-ignore
        type: TYPE_MAP[module._get_entry_type(entry) as number],
        ref: entry,
      };

      if (entryData.type === "FILE") {
        let fileName = entryData.path.split("/");
        //@ts-ignore
        entryData.fileName = fileName[fileName.length - 1];
      }

      if (skipExtraction) {
        module._archive_read_data_skip(archive);
      } else {
        const ptr = module._get_filedata(archive, entryData.size);
        if (ptr < 0) {
          throw new Error(module._get_error(archive));
        }
        //@ts-ignore
        entryData.fileData = module.HEAP8.slice(ptr, ptr + entryData.size);
        module._free(ptr);
      }
      yield entryData;
    }
  }
}

export const worker = new ArchiveWorker();

comlink.expose(worker);
