import type { ArchiveEntry } from "@webexplorer/archive";

export type EPubMetadata = {
  title: string;
  creator: string;
  identifier: string;
  language: string;
  publisher: string;
  others: Record<string, string>[];
};

export type EPubManifest = {
  items: Record<string, EPubItem>;
};

export type EPubItem = {
  id: string;
  href: string;
  mediaType: string;
};

export type EPubSpine = {
  toc: string;
  itemRefs: { idRef: string }[];
};

export type EPub = {
  root: string;
  metadata: EPubMetadata;
  manifest: EPubManifest;
  spine: EPubSpine;
};

export function parse({ entries }: { entries: ArchiveEntry[] }): EPub {
  const containerXmlEntry = entries.find((entry) => {
    return entry.path === "META-INF/container.xml";
  });
  if (!containerXmlEntry) {
    throw new Error("can't find container file");
  }

  const textDecoder = new TextDecoder("utf-8");
  const parser = new DOMParser();

  const containerXml = textDecoder.decode(containerXmlEntry.data);
  const containerDoc: XMLDocument = parser.parseFromString(
    containerXml,
    "application/xml"
  );
  const rootFile = containerDoc.querySelector("container rootfiles rootfile");
  if (!rootFile) {
    throw new Error("no rootfile element");
  }

  const fullPath = rootFile.getAttribute("full-path");
  const rootFileEntry = entries.find((entry) => {
    return entry.path === fullPath;
  });

  if (!rootFileEntry) {
    throw new Error("can't find root file");
  }

  const root = determineRoot(rootFileEntry.path);

  const rootXml = textDecoder.decode(rootFileEntry?.data);
  const rootDoc: XMLDocument = parser.parseFromString(
    rootXml,
    "application/xml"
  );
  const metadata = parseMetadata(rootDoc);
  const manifest = parseManifest(rootDoc);
  const spine = parseSpine(rootDoc);

  return {
    root,
    metadata,
    manifest,
    spine,
  };
}

export function parseMetadata(xml: XMLDocument): EPubMetadata {
  const metadataNode = xml.querySelector("package metadata");
  if (!metadataNode) {
    throw new Error("no metadata in package");
  }

  const titleNodes = metadataNode.getElementsByTagName("dc:title");
  if (titleNodes.length !== 1) {
    throw new Error("no title in metadata");
  }

  const creatorNodes = metadataNode.getElementsByTagName("dc:creator");
  if (creatorNodes.length !== 1) {
    throw new Error("no creator in metadata");
  }

  const identifierNodes = metadataNode.getElementsByTagName("dc:identifier");
  if (identifierNodes.length !== 1) {
    throw new Error("no identifier in metadata");
  }

  const languageNodes = metadataNode.getElementsByTagName("dc:language");
  if (languageNodes.length !== 1) {
    throw new Error("no language in metadata");
  }

  const publisherNodes = metadataNode.getElementsByTagName("dc:publisher");
  if (publisherNodes.length !== 1) {
    throw new Error("no publisher in metadata");
  }

  return {
    title: titleNodes[0].textContent || "",
    creator: creatorNodes[0].textContent || "",
    language: languageNodes[0].textContent || "",
    publisher: publisherNodes[0].textContent || "",
    identifier: identifierNodes[0].textContent || "",
    others: [],
  };
}

export function parseManifest(xml: XMLDocument): EPubManifest {
  const manifestNode = xml.querySelector("package manifest");
  if (!manifestNode) {
    throw new Error("no manifest in package");
  }

  const itemNodes = manifestNode.querySelectorAll("item");

  const items: Record<string, EPubItem> = {};
  for (let itemNode of itemNodes) {
    const id = itemNode.getAttribute("id");
    if (id === null) {
      throw new Error("no id for item");
    }

    const href = itemNode.getAttribute("href");
    if (href === null) {
      throw new Error("no href for item");
    }

    const mediaType = itemNode.getAttribute("media-type");
    if (mediaType === null) {
      throw new Error("no media-type for item");
    }

    items[id] = {
      id,
      href,
      mediaType,
    };
  }

  return {
    items,
  };
}

export function parseSpine(xml: XMLDocument): EPubSpine {
  const spineNode = xml.querySelector("package spine");
  if (!spineNode) {
    throw new Error("no manifest in package");
  }

  const toc = spineNode.getAttribute("toc");

  const itemNodes = spineNode.querySelectorAll("itemref");

  const itemRefs = [];
  for (let itemNode of itemNodes) {
    const idRef = itemNode.getAttribute("idref");
    if (idRef === null) {
      throw new Error("no id for item");
    }

    itemRefs.push({
      idRef,
    });
  }

  return {
    toc: toc || "",
    itemRefs,
  };
}

export function determineRoot(opfPath: string) {
  let root = "";
  if (opfPath.match(/\//)) {
    root = opfPath.replace(/\/([^\/]+)\.opf/i, "");
    if (!root.match(/\/$/)) {
      root += "/";
    }
    if (root.match(/^\//)) {
      root = root.replace(/^\//, "");
    }
  }
  return root;
}
