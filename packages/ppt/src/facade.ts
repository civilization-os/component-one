import { buildHtmlBundle } from "./adapters/html/index.js";
import { buildPptxArtifact } from "./adapters/pptx.js";
import { deckToPptxInput, isDeckInput, pptxInputToDeck } from "./ingest.js";
import { requirePptPreset } from "./presets.js";
import type {
  PptDeck,
  PptBuildResult,
  PptEngine,
  PptOutput,
  PptPresentationBuilder,
  PptPresentationInput,
  PptPresetId,
  PptTarget,
  PptTemplatePreset
} from "./types.js";

type BuilderState = {
  presetId: PptPresetId;
  target: PptTarget;
  engine?: PptEngine;
  input: PptPresentationInput;
  output: PptOutput;
};

const defaultOutput: PptOutput = { mode: "memory" };

export function createPresentation(): PptPresentationBuilder {
  return new PresentationBuilder();
}

class PresentationBuilder implements PptPresentationBuilder {
  private readonly state: Partial<BuilderState> = {};

  preset(id: PptPresetId): PptPresentationBuilder {
    this.state.presetId = id;
    return this;
  }

  target(target: PptTarget): PptPresentationBuilder {
    this.state.target = target;
    return this;
  }

  engine(engine: PptEngine): PptPresentationBuilder {
    this.state.engine = engine;
    return this;
  }

  input(input: PptPresentationInput): PptPresentationBuilder {
    this.state.input = input;
    return this;
  }

  output(output: PptOutput): PptPresentationBuilder {
    this.state.output = output;
    return this;
  }

  async build(): Promise<PptBuildResult> {
    const presetId = this.state.presetId;
    const target = this.state.target;
    const input = this.state.input;

    if (!presetId) {
      throw new Error("Presentation preset is required.");
    }

    if (!target) {
      throw new Error("Presentation target is required.");
    }

    if (!input) {
      throw new Error("Presentation input is required.");
    }

    const preset = requirePptPreset(presetId);
    const requestedEngine = this.state.engine;
    const output = this.state.output ?? defaultOutput;
    const finalEngine = resolveEngine(target, requestedEngine, preset);

    if (finalEngine === "html") {
      const deck = isDeckInput(input) ? input : pptxInputToDeck(input, { presetId });
      return buildHtmlBundle({
        deck,
        output,
        preset,
        target: "html-bundle",
        requestedEngine
      });
    }

    const pptxInput = isDeckInput(input) ? deckToPptxInput(input as PptDeck) : input;

    return buildPptxArtifact({
      input: pptxInput,
      output,
      preset,
      target: "editable-pptx",
      requestedEngine: requestedEngine === "pptx" ? requestedEngine : undefined
    });
  }
}

function resolveEngine(target: PptTarget, requestedEngine: PptEngine | undefined, preset: PptTemplatePreset): PptEngine {
  if (target === "editable-pptx") {
    return "pptx";
  }

  if (requestedEngine === "html") {
    return requestedEngine;
  }

  return preset.preferredEngines[target];
}
