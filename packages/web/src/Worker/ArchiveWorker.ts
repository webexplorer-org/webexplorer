import { init, unarchive, ArchiveModule } from "@webexplorer/archive";
// @ts-ignore
import wasmUrl from "@webexplorer/archive/src/libarchive.wasm";
import * as comlink from "comlink";

export class ArchiveWorker {
  module: ArchiveModule | undefined;
  filePtr: number | null = null;
  fileLength: number = 0;
  passphrase: string | null = null;

  async init() {
    if (this.module) {
      return;
    }

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
    const array = new Int8Array(buffer);

    const module = this.getModule();

    const filePtr = module.malloc(array.length);
    module.HEAP8.set(array, filePtr);

    this.filePtr = filePtr;
    this.fileLength = array.length;
    this.passphrase = passphrase;
  }

  async close() {
    if (this.filePtr) {
      const module = this.getModule();

      module.free(this.filePtr);
      this.filePtr = null;
    }
  }

  entries(skipExtraction = true) {
    if (!this.filePtr || !this.fileLength) {
      throw new Error("invalid file");
    }

    const module = this.getModule();
    return unarchive(
      module,
      this.filePtr,
      this.fileLength,
      this.passphrase,
      skipExtraction
    );
  }
}

export const worker = new ArchiveWorker();

comlink.expose(worker);
