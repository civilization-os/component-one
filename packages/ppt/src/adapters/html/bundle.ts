import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { PptArtifactFileMap, PptBuildResult, PptDeck, PptDeckBlock, PptDeckSlide, PptOutput, PptTemplatePreset } from "../../types.js";
import { materializeAssetForHtml } from "../../utils/assets.js";
import { createHtmlDocument, createThemeCss } from "./template.js";
import { createRuntimeScript } from "./runtime.js";

export async function buildHtmlBundle(options: {
  deck: PptDeck;
  output: PptOutput;
  preset: PptTemplatePreset;
  target: "html-bundle";
  requestedEngine?: "html" | "pptx";
}): Promise<PptBuildResult> {
  const { deck, assetFiles } = await prepareDeckForHtml(options.deck);
  const files = createBundleFiles(deck, options.preset, assetFiles);

  if (options.output.mode === "file") {
    const outputPath = options.output.path;
    await writeArtifactDirectory(outputPath, files);

    return {
      target: options.target,
      presetId: options.preset.id,
      requestedEngine: options.requestedEngine,
      finalEngine: "html",
      artifactKind: "directory",
      outputPath
    };
  }

  return {
    target: options.target,
    presetId: options.preset.id,
    requestedEngine: options.requestedEngine,
    finalEngine: "html",
    artifactKind: "file-map",
    artifact: files
  };
}

async function prepareDeckForHtml(deck: PptDeck): Promise<{ deck: PptDeck; assetFiles: PptArtifactFileMap }> {
  const clonedSlides: PptDeckSlide[] = [];
  const assetFiles: PptArtifactFileMap = {};

  for (const [slideIndex, slide] of deck.slides.entries()) {
    const clonedSteps = [];

    for (const [stepIndex, step] of slide.steps.entries()) {
      const clonedBlocks: PptDeckBlock[] = [];

      for (const [blockIndex, block] of step.blocks.entries()) {
        if (block.kind !== "image") {
          clonedBlocks.push(block);
          continue;
        }

        const materialized = await materializeAssetForHtml(block.asset, `slide-${slideIndex + 1}-step-${stepIndex + 1}-block-${blockIndex + 1}`);

        if (materialized.file) {
          assetFiles[materialized.file.path] = materialized.file;
        }

        clonedBlocks.push({
          ...block,
          asset: {
            kind: "path",
            path: materialized.reference
          }
        });
      }

      clonedSteps.push({
        ...step,
        blocks: clonedBlocks
      });
    }

    clonedSlides.push({
      ...slide,
      steps: clonedSteps
    });
  }

  return {
    deck: {
      ...deck,
      slides: clonedSlides
    },
    assetFiles
  };
}

function createBundleFiles(deck: PptDeck, preset: PptTemplatePreset, assetFiles: PptArtifactFileMap): PptArtifactFileMap {
  const deckJson = JSON.stringify(deck, null, 2);
  const deckJs = `window.__PPT_DECK__ = ${JSON.stringify(deck)};\n`;

  return {
    "index.html": {
      path: "index.html",
      content: createHtmlDocument({
        title: deck.title,
        language: deck.language,
        mode: "audience"
      })
    },
    "speaker.html": {
      path: "speaker.html",
      content: createHtmlDocument({
        title: `${deck.title} - Speaker View`,
        language: deck.language,
        mode: "speaker"
      })
    },
    "deck.json": {
      path: "deck.json",
      content: deckJson
    },
    "deck.js": {
      path: "deck.js",
      content: deckJs
    },
    "runtime.js": {
      path: "runtime.js",
      content: createRuntimeScript(preset)
    },
    "theme.css": {
      path: "theme.css",
      content: createThemeCss(preset)
    },
    ...assetFiles
  };
}

async function writeArtifactDirectory(outputPath: string, files: PptArtifactFileMap): Promise<void> {
  await mkdir(outputPath, { recursive: true });

  for (const file of Object.values(files)) {
    const destination = path.join(outputPath, file.path);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, file.content);
  }
}
