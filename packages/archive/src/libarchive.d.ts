import type { EmscriptenModuleFactory, EmscriptenModule } from "emscripten";

export interface ArchiveModule extends EmscriptenModule {
  _get_version: () => string;
  _archive_open: () => void;
  _get_next_entry: () => void;
  _get_filedata: () => void;
  _archive_close: () => void;
  _archive_entry_filetype: () => void;
  _archive_entry_pathname: () => void;
  _archive_entry_pathname_utf8: () => void;
  _archive_entry_size: () => void;
  _archive_read_data_skip: () => void;
  _archive_error_string: () => void;
  _archive_entry_is_encrypted: () => void;
  _archive_read_has_encrypted_entries: () => void;
  _archive_read_add_passphrase: () => void;
}

const libarchive: EmscriptenModuleFactory<ArchiveModule>;

export default libarchive;
