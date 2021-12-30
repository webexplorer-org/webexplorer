import type { EmscriptenModuleFactory, EmscriptenModule } from "emscripten";

type JavaScriptTypeName = "string" | "number";

type JavaScriptType<S extends string | null> = S extends null
  ? null
  : S extends "string"
  ? string
  : S extends "number"
  ? number
  : S extends `string | ${infer R}`
  ? string | JavaScriptType<R>
  : S extends `number | ${infer R}`
  ? number | JavaScriptType<R>
  : S extends `null | ${infer R}`
  ? null | JavaScriptType<R>
  : void;

type JavaScriptTypeArray<T extends JavaScriptTypeName[]> = T extends readonly [
  infer S,
  ...infer R
]
  ? [JavaScriptType<S>, ...JavaScriptTypeArray<R>]
  : unknown;

type ModuleReturnType<R extends JavaScriptTypeName> = JavaScriptType<R>;
type ModuleArgsType<U extends JavaScriptTypeName[]> = JavaScriptTypeArray<U>;

export interface ArchiveModule extends EmscriptenModule {
  _cwrap<R extends JavaScriptTypeName, U extends JavaScriptTypeName[]>(
    fun: string,
    returnType: R,
    argTypes: U
  ): (...args: ModuleArgsType<U>) => ModuleReturnType<R>;

  HEAP8: Int8Array;

  _malloc(size: number): number;
  _free(ptr: number): void;

  /*
   * For reference, don't call these functions directly
   */
  _get_version(): string;
  _archive_open(ptr: number, len: number, passphrase: string | null): number;
  _get_next_entry(archive: number): number;
  _get_filedata(archive: number, size: number): number;
  _archive_close(archive: number): void;
  _archive_entry_filetype(archive: number): number;
  _archive_entry_pathname(archive: number): string;
  _archive_entry_pathname_utf8(archive: number): string;
  _archive_entry_size(archive: number): number;
  _archive_read_data_skip(archive: number): number;
  _archive_error_string(archive: number): string;
  _archive_entry_is_encrypted(archive: number): number;
  _archive_read_has_encrypted_entries(archive: number): number;
  _archive_read_add_passphrase(archive: number, passphrase: string): number;
}

export function wrap(module: ArchiveModule) {
  return {
    open: module._cwrap("_archive_open", "number", [
      "number",
      "number",
      "string",
    ]),
    close: module._cwrap("_archive_close", null, ["number"]),
    getNextEntry: module._cwrap("_get_next_entry", "number", ["number"]),
  };
}

const libarchive: EmscriptenModuleFactory<ArchiveModule>;

export default libarchive;
