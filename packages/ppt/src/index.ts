export { createPresentation } from "./facade.js";
export {
  buildDeckJsonGenerationPrompt,
  buildMarkdownGenerationPrompt,
  getDeckJsonContract,
  getMarkdownSourceContract
} from "./contracts.js";
export type { PptPromptBuildOptions } from "./contracts.js";
export { createDeckFromSource, deckToPptxInput, isDeckInput, pptxInputToDeck } from "./ingest.js";
export { normalizeGeneratedDeck, normalizeGeneratedMarkdown } from "./normalize.js";
export { compactSpeakerNotes, formatSpeakerNotes, getSpeakerNoteLabels, parseSpeakerNotesText } from "./notes.js";
export { getPptPreset, listPptPresets, requirePptPreset } from "./presets.js";
export {
  pptAssetSchema,
  pptDeckActionSchema,
  pptDeckBlockSchema,
  pptDeckSchema,
  pptDeckSlideSchema,
  pptDeckStepSchema,
  pptDeckTransitionSchema,
  pptLanguageSchema,
  pptPresetIdSchema,
  pptSpeakerNotesSchema,
  pptSourceInputSchema,
  pptSourceKindSchema,
  validateDeck,
  validateSourceInput
} from "./schema.js";

export type {
  PptArtifactFile,
  PptArtifactFileMap,
  PptAssetInput,
  PptBuildResult,
  PptBufferAssetInput,
  PptDeck,
  PptDeckAction,
  PptDeckBlock,
  PptDeckComparisonItem,
  PptDeckMetricItem,
  PptDeckSlide,
  PptDeckStep,
  PptDeckTimelineItem,
  PptDeckTransition,
  PptEngine,
  PptLanguage,
  PptLayoutPreset,
  PptOutput,
  PptPlaceholder,
  PptPlaceholderKind,
  PptPresentationBuilder,
  PptPresentationInput,
  PptPresetId,
  PptSpeakerNotes,
  PptSpeakerStepGuidance,
  PptSourceInput,
  PptSourceKind,
  PptTarget,
  PptTemplatePreset,
  PptTextStyle,
  PptUrlAssetInput,
  PptPathAssetInput,
  PptxPresentationInput,
  PptxSlideInput
} from "./types.js";
