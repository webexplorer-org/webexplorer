"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.determineRoot = exports.parseSpine = exports.parseManifest = exports.parseMetadata = exports.parse = void 0;
function parse({ entries }) {
    const containerXmlEntry = entries.find((entry) => {
        return entry.path === "META-INF/container.xml";
    });
    if (!containerXmlEntry) {
        throw new Error("can't find container file");
    }
    const textDecoder = new TextDecoder("utf-8");
    const parser = new DOMParser();
    const containerXml = textDecoder.decode(containerXmlEntry.data);
    const containerDoc = parser.parseFromString(containerXml, "application/xml");
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
    const rootXml = textDecoder.decode(rootFileEntry === null || rootFileEntry === void 0 ? void 0 : rootFileEntry.data);
    const rootDoc = parser.parseFromString(rootXml, "application/xml");
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
exports.parse = parse;
function parseMetadata(xml) {
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
exports.parseMetadata = parseMetadata;
function parseManifest(xml) {
    const manifestNode = xml.querySelector("package manifest");
    if (!manifestNode) {
        throw new Error("no manifest in package");
    }
    const itemNodes = manifestNode.querySelectorAll("item");
    const items = {};
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
exports.parseManifest = parseManifest;
function parseSpine(xml) {
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
exports.parseSpine = parseSpine;
function determineRoot(opfPath) {
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
exports.determineRoot = determineRoot;
