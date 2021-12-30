import type {
  EmscriptenModuleFactory,
  EmscriptenModule,
  cwrap,
} from "emscripten";

export interface LibArchiveModule extends EmscriptenModule {
  cwrap: typeof cwrap;
  HEAP8: Int8Array;
}

const libarchive: EmscriptenModuleFactory<LibArchiveModule>;

export default libarchive;
