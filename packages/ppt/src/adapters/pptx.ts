import { mkdir } from "node:fs/promises";
import path from "node:path";

import type { PptBuildResult, PptLayoutPreset, PptOutput, PptTemplatePreset, PptxPresentationInput, PptxSlideInput } from "../types.js";
import { materializeAssetForPptx, toUint8Array } from "../utils/assets.js";

type PptxRuntime = {
  layout: string;
  author: string;
  company: string;
  subject: string;
  title: string;
  theme: {
    headFontFace: string;
    bodyFontFace: string;
  };
  ShapeType: {
    rect: string;
  };
  addSlide(): PptxSlideRuntime;
  write(props?: Record<string, unknown>): Promise<string | ArrayBuffer | Blob | Uint8Array>;
  writeFile(props?: Record<string, unknown>): Promise<string>;
};

type PptxSlideRuntime = {
  background?: {
    color: string;
  };
  addShape(shapeType: string, options: Record<string, unknown>): void;
  addText(text: string | Array<{ text: string; options?: Record<string, unknown> }>, options?: Record<string, unknown>): void;
  addImage(options: Record<string, unknown>): void;
  addNotes?(notes: string): void;
};

export async function buildPptxArtifact(options: {
  input: PptxPresentationInput;
  output: PptOutput;
  preset: PptTemplatePreset;
  target: "editable-pptx";
  requestedEngine?: "pptx";
}): Promise<PptBuildResult> {
  const deck = await createDeck(options.input, options.preset);

  if (options.output.mode === "file") {
    const outputPath = ensurePptxFilePath(options.output.path);
    await mkdir(path.dirname(outputPath), { recursive: true });
    await deck.writeFile({ fileName: outputPath });

    return {
      target: options.target,
      presetId: options.preset.id,
      requestedEngine: options.requestedEngine,
      finalEngine: "pptx",
      artifactKind: "file",
      outputPath
    };
  }

  const payload = await deck.write({ outputType: "nodebuffer" });

  return {
    target: options.target,
    presetId: options.preset.id,
    requestedEngine: options.requestedEngine,
    finalEngine: "pptx",
    artifactKind: "buffer",
    artifact: normalizePptxPayload(payload)
  };
}

async function createDeck(input: PptxPresentationInput, preset: PptTemplatePreset): Promise<PptxRuntime> {
  const PptxGenJS = await loadPptxRuntime();
  const deck = new PptxGenJS();

  deck.layout = "LAYOUT_WIDE";
  deck.author = input.author ?? "civilization-os";
  deck.company = input.company ?? "civilization-os";
  deck.subject = input.subject ?? input.title;
  deck.title = input.title;
  deck.theme = {
    headFontFace: preset.theme.fonts.heading,
    bodyFontFace: preset.theme.fonts.body
  };

  for (const [index, slideInput] of input.slides.entries()) {
    await addSlide(deck, preset, slideInput, index);
  }

  return deck;
}

async function addSlide(deck: PptxRuntime, preset: PptTemplatePreset, input: PptxSlideInput, index: number): Promise<void> {
  const slide = deck.addSlide();
  slide.background = {
    color: preset.theme.colors.background
  };

  slide.addShape(deck.ShapeType.rect, {
    x: 0,
    y: 0,
    w: preset.size.width,
    h: 0.12,
    fill: { color: preset.theme.colors.accent },
    line: { color: preset.theme.colors.accent }
  });

  const layout = resolveLayout(preset, input, index);
  const titlePlaceholder = findPlaceholder(layout, "title");
  const bodyPlaceholder = findPlaceholder(layout, "body");
  const imagePlaceholder = findPlaceholder(layout, "media");

  slide.addText(input.title, {
    x: titlePlaceholder?.x ?? 0.7,
    y: titlePlaceholder?.y ?? 0.55,
    w: titlePlaceholder?.w ?? 11.9,
    h: titlePlaceholder?.h ?? 0.75,
    fontFace: preset.theme.fonts.heading,
    fontSize: titlePlaceholder?.style?.fontSize ?? 28,
    bold: true,
    color: preset.theme.colors.title,
    fit: "shrink"
  });

  if (input.body || (input.bullets && input.bullets.length > 0)) {
    if (input.bullets && input.bullets.length > 0) {
      slide.addText(
        input.bullets.map((item) => ({
          text: item,
          options: {
            bullet: { type: "bullet" }
          }
        })),
        {
          x: bodyPlaceholder?.x ?? 0.9,
          y: bodyPlaceholder?.y ?? 1.6,
          w: bodyPlaceholder?.w ?? 10.8,
          h: bodyPlaceholder?.h ?? 4.7,
          fontFace: preset.theme.fonts.body,
          fontSize: bodyPlaceholder?.style?.fontSize ?? 18,
          color: preset.theme.colors.body,
          fit: "shrink",
          paraSpaceAfterPt: 10
        }
      );
    } else if (input.body) {
      slide.addText(input.body, {
        x: bodyPlaceholder?.x ?? 0.9,
        y: bodyPlaceholder?.y ?? 1.6,
        w: bodyPlaceholder?.w ?? 10.8,
        h: bodyPlaceholder?.h ?? 4.7,
        fontFace: preset.theme.fonts.body,
        fontSize: bodyPlaceholder?.style?.fontSize ?? 18,
        color: preset.theme.colors.body,
        fit: "shrink"
      });
    }
  }

  if (input.image) {
    const image = await materializeAssetForPptx(input.image);

    slide.addImage({
      ...image,
      x: imagePlaceholder?.x ?? 8.45,
      y: imagePlaceholder?.y ?? 1.55,
      w: imagePlaceholder?.w ?? 4.0,
      h: imagePlaceholder?.h ?? 3.9
    });
  }

  if (input.notes?.trim()) {
    slide.addNotes?.(input.notes.trim());
  }
}

function resolveLayout(preset: PptTemplatePreset, input: PptxSlideInput, index: number): PptLayoutPreset {
  if (input.layoutId) {
    const explicit = preset.layouts.find((layout) => layout.id === input.layoutId);

    if (explicit) {
      return explicit;
    }
  }

  if (input.image) {
    return preset.layouts.find((layout) => layout.placeholders.some((placeholder) => placeholder.role === "media")) ?? preset.layouts[0];
  }

  if (index === 0) {
    return preset.layouts[0];
  }

  return preset.layouts.find((layout) => layout.placeholders.some((placeholder) => placeholder.role === "body")) ?? preset.layouts[0];
}

function findPlaceholder(layout: PptLayoutPreset, role: string) {
  return layout.placeholders.find((placeholder) => placeholder.role === role);
}

async function loadPptxRuntime(): Promise<new () => PptxRuntime> {
  let module: { default?: new () => PptxRuntime };

  try {
    module = (await import("pptxgenjs")) as unknown as { default?: new () => PptxRuntime };
  } catch {
    throw new Error(
      'pptxgenjs is not installed. Run "npm install pptxgenjs" to enable .pptx export, ' +
      'or install it as an optional dependency: "npm install --save-optional pptxgenjs".'
    );
  }

  if (!module.default) {
    throw new Error("pptxgenjs default export is unavailable.");
  }

  return module.default;
}

function normalizePptxPayload(payload: string | ArrayBuffer | Blob | Uint8Array): Uint8Array {
  if (payload instanceof Uint8Array) {
    return payload;
  }

  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload);
  }

  if (typeof payload === "string") {
    return new Uint8Array(Buffer.from(payload));
  }

  throw new Error("Unsupported PPTX payload type returned by pptxgenjs.");
}

function ensurePptxFilePath(filePath: string): string {
  return filePath.toLowerCase().endsWith(".pptx") ? filePath : `${filePath}.pptx`;
}
