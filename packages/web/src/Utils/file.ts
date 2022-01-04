import * as mime from "mime";

const typeMap = {
  "application/x-gtp": ["gp3", "gp4", "gp5"],
};

mime.define(typeMap);

export function mimeType(file: File) {
  // @ts-ignore
  const fileType = file.type || mime.getType(file.name);
  if (fileType) {
    return fileType;
  }
}
