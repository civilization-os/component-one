import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PptArtifactFile, PptAssetInput, PptBufferAssetInput } from "../types.js";

export type PptxAssetMaterialization = {
  path?: string;
  data?: string;
};

export type HtmlAssetMaterialization = {
  reference: string;
  file?: PptArtifactFile;
};

const extensionByMimeType: Record<string, string> = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp"
};

export async function materializeAssetForPptx(asset: PptAssetInput): Promise<PptxAssetMaterialization> {
  if (asset.kind === "path") {
    return {
      path: path.resolve(asset.path)
    };
  }

  if (asset.kind === "url") {
    const response = await fetch(asset.url);

    if (!response.ok) {
      throw new Error(`Failed to fetch remote asset: ${asset.url}`);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const mimeType = response.headers.get("content-type") ?? "application/octet-stream";

    return {
      data: toDataUri(bytes, mimeType)
    };
  }

  return {
    data: toDataUri(toUint8Array(asset.data), asset.mimeType ?? guessMimeTypeFromExtension(asset.extension) ?? "application/octet-stream")
  };
}

export function toUint8Array(data: Uint8Array | ArrayBuffer): Uint8Array {
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

export function normalizeBufferAsset(data: Uint8Array | ArrayBuffer, fileName: string, mimeType?: string): PptBufferAssetInput {
  return {
    kind: "buffer",
    data: toUint8Array(data),
    fileName,
    mimeType
  };
}

export async function materializeAssetForHtml(asset: PptAssetInput, stem: string): Promise<HtmlAssetMaterialization> {
  if (asset.kind === "url") {
    return {
      reference: asset.url
    };
  }

  if (asset.kind === "path") {
    const bytes = new Uint8Array(await readFile(asset.path));
    const extension = normalizeExtension(path.extname(asset.path)) || ".bin";
    const filePath = `assets/${sanitizeStem(stem)}${extension}`;

    return {
      reference: `./${filePath}`,
      file: {
        path: filePath,
        content: bytes
      }
    };
  }

  const bytes = toUint8Array(asset.data);
  const extension = normalizeExtension(asset.extension) || extensionByMimeType[asset.mimeType ?? ""] || ".bin";
  const fileName = asset.fileName ? sanitizeStem(path.parse(asset.fileName).name) : sanitizeStem(stem);
  const filePath = `assets/${fileName}${extension}`;

  return {
    reference: `./${filePath}`,
    file: {
      path: filePath,
      content: bytes
    }
  };
}

function toDataUri(bytes: Uint8Array, mimeType: string): string {
  return `data:${mimeType};base64,${Buffer.from(bytes).toString("base64")}`;
}

function guessMimeTypeFromExtension(extension?: string): string | undefined {
  const normalized = normalizeExtension(extension);

  if (!normalized) {
    return undefined;
  }

  const match = Object.entries(extensionByMimeType).find((entry) => entry[1] === normalized);
  return match?.[0];
}

function normalizeExtension(extension?: string): string | undefined {
  if (!extension) {
    return undefined;
  }

  return extension.startsWith(".") ? extension.toLowerCase() : `.${extension.toLowerCase()}`;
}

function sanitizeStem(value: string): string {
  return value.replace(/[^a-zA-Z0-9-_]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "asset";
}
