import { requirePptPreset } from "./presets.js";
import type { PptLanguage, PptPresetId } from "./types.js";

export type PptPromptBuildOptions = {
  language: PptLanguage;
  source: string;
  presetId?: PptPresetId;
  mode?: "authoring" | "presenting";
  extraInstructions?: string;
};

export function getMarkdownSourceContract(language: PptLanguage): string {
  const noteMarkers =
    language === "zh-CN" ? ["\u8bb2\u8005\u5907\u6ce8\uff1a", "\u6f14\u8bb2\u5907\u6ce8\uff1a"] : ["Speaker note:"];

  const genericNotes =
    language === "zh-CN"
      ? ["\u6458\u8981\uff1a...", "\u63d0\u793a\uff1a...", "\u8282\u594f\uff1a...", "\u5f3a\u8c03\uff1a..."]
      : ["Summary: ...", "Cue: ...", "Timing: ...", "Emphasis: ..."];

  const stepNotes =
    language === "zh-CN"
      ? [
          "\u7b2c2\u6b65 \u63d0\u793a\uff1a...",
          "\u7b2c3\u6b65 \u8282\u594f\uff1a...",
          "\u7b2c4\u6b65 \u5f3a\u8c03\uff1a...",
          "\u7b2c3\u6b65 \u9ad8\u4eae\uff1a[block-id]",
          "\u7b2c3\u6b65 \u9ad8\u4eae\u9000\u51fa\u8282\u594f\uff1a40, 220, ease-in",
          "\u7b2c4\u6b65 \u51fa\u73b0\uff1a[block-id]",
          "\u7b2c4\u6b65 \u51fa\u73b0\u9000\u51fa\u8282\u594f\uff1a20, 200, ease-in",
          "\u7b2c2\u6b65 \u805a\u5149\u706f\uff1a[block-id]",
          "\u7b2c2\u6b65 \u805a\u5149\u706f\uff1a0.55, 0.42, 0.18",
          "\u7b2c2\u6b65 \u805a\u5149\u706f\u9000\u51fa\u8282\u594f\uff1a10, 180, ease-in",
          "\u7b2c4\u6b65 \u6fc0\u5149\uff1a0.15,0.72 -> 0.42,0.50 -> 0.74,0.33",
          "\u7b2c4\u6b65 \u6fc0\u5149\u9000\u51fa\u8282\u594f\uff1a10, 220, ease-in"
        ]
      : [
          "Step 2 Cue: ...",
          "Step 3 Timing: ...",
          "Step 4 Emphasis: ...",
          "Step 3 Highlight: [block-id]",
          "Step 3 Highlight Exit Timing: 40, 220, ease-in",
          "Step 4 Appear: [block-id]",
          "Step 4 Appear Exit Timing: 20, 200, ease-in",
          "Step 2 Spotlight: [block-id]",
          "Step 2 Spotlight Shape: pill",
          "Step 2 Spotlight: 0.55, 0.42, 0.18",
          "Step 2 Spotlight Exit Timing: 10, 180, ease-in",
          "Step 4 Laser: 0.15,0.72 -> 0.42,0.50 -> 0.74,0.33",
          "Step 4 Laser Anchor: target",
          "Step 4 Laser Exit Timing: 10, 220, ease-in"
        ];

  const rules =
    language === "zh-CN"
      ? [
          "\u53ea\u8f93\u51fa markdown\uff0c\u4e0d\u8981\u8f93\u51fa\u89e3\u91ca\u3002",
          "\u6bcf\u4e00\u9875\u7528 --- \u5206\u9694\u3002",
          "\u91cd\u8981 block \u9700\u8981\u663e\u5f0f anchor\uff0c\u4f8b\u5982 {#runtime-timeline}\u3002",
          "speaker note \u53ea\u80fd\u5199\u5728\u9875\u5c3e\u5907\u6ce8\u533a\uff0c\u4e0d\u8981\u6df7\u8fdb\u6b63\u6587\u3002",
          "step-bound \u52a8\u4f5c\u5982\u679c\u5f15\u7528 block\uff0c\u5fc5\u987b\u5f15\u7528\u5f53\u524d step \u53ef\u89c1\u7684 block id\u3002",
          "\u805a\u5149\u706f\u53ef\u4ee5\u5199\u6210 [block-id] \u6216 x, y, radius\u3002",
          "\u6fc0\u5149\u683c\u5f0f\u56fa\u5b9a\u4e3a x1,y1 -> x2,y2 -> ...\u3002",
          "\u52a8\u4f5c\u8282\u594f\u683c\u5f0f\u56fa\u5b9a\u4e3a delayMs, durationMs, easing\u3002",
          "\u9000\u51fa\u8282\u594f\u9700\u8981\u4f7f\u7528 <Action> \u9000\u51fa\u8282\u594f \u8FD9\u79CD\u663E\u5F0F\u8BED\u6CD5\u3002"
        ]
      : [
          "Output markdown only. Do not add commentary.",
          "Separate slides with ---.",
          "Use explicit anchors for important blocks, for example {#runtime-timeline}.",
          "Keep speaker notes in the note section at the end of the slide.",
          "Step-bound actions that target blocks must reference block ids visible by that step.",
          "Spotlight format may be either [block-id] or x, y, radius.",
          "Spotlight Shape must be one of auto, circle, or pill.",
          "Laser format must be x1,y1 -> x2,y2 -> ....",
          "Laser Anchor must be target or custom.",
          "Action timing format must be delayMs, durationMs, easing.",
          "Use explicit <Action> Exit Timing lines when you need a custom exit phase."
        ];

  return [
    "# PPT Markdown Source Contract",
    "",
    language === "zh-CN"
      ? "\u751f\u6210\u7ed3\u679c\u5fc5\u987b\u517c\u5bb9 @civilization-os/ppt \u7684 markdown ingest\u3002"
      : "Generated output must be compatible with @civilization-os/ppt markdown ingest.",
    "",
    "## Rules",
    ...rules.map((rule) => `- ${rule}`),
    "",
    "## Step numbering rule",
    "- Each block becomes exactly ONE step.",
    "- Step 1 is always the first block on the slide.",
    "- If a slide has 3 blocks (heading, paragraph, list), step numbers are 1, 2, 3.",
    "- Speaker note actions that reference a step must match this numbering.",
    "",
    "## Supported note markers",
    ...noteMarkers.map((marker) => `- ${marker}`),
    "",
    "## Supported generic note lines",
    ...genericNotes.map((line) => `- ${line}`),
    "",
    "## Supported step-bound note lines",
    ...stepNotes.map((line) => `- ${line}`),
    "",
    "## Supported structured blocks",
    "- ::: callout",
    "- ::: metrics",
    "- ::: two-column",
    "- ::: timeline",
    "- ::: process",
    "- ::: quadrant",
    "- ::: comparison",
    "",
    "## Anchor examples",
    "- ## Lifecycle Split {#lifecycle-title}",
    "- Plain paragraph text. {#plain-copy}",
    "- Bullet item with anchor. {#bullet-anchor}",
    "- Another bullet with its own anchor. {#second-anchor}",
    "- | State | Output | {#state-table}",
    "- ::: timeline {#runtime-timeline}",
    "",
    "## Output reminder",
    language === "zh-CN" ? "\u8f93\u51fa\u5fc5\u987b\u662f\u7eaf markdown\u3002" : "Output must be pure markdown."
  ].join("\n");
}

export function getDeckJsonContract(): string {
  return [
    "# PPT Deck JSON Contract",
    "",
    "Generated output must be valid input for validateDeck(...).",
    "",
    "## Required top-level fields",
    '- "title": non-empty string',
    '- "language": "en-US" or "zh-CN"',
    '- "slides": non-empty array',
    "",
    "## Slide shape",
    '- "id": unique string',
    '- "title"?: string',
    '- "notes"?: structured speaker notes',
    '- "steps": non-empty array',
    "",
    "## Step shape",
    '- "id": unique within the slide',
    '- "blocks": non-empty array',
      '- "actions"?: array of appear | highlight | spotlight | laser',
      '- each action may also carry "timing"?: { "delayMs"?: number, "durationMs"?: number, "easing"?: string }',
      '- each action may also carry "exitTiming"?: { "delayMs"?: number, "durationMs"?: number, "easing"?: string }',
    '- "transition"?: { "kind": "none" | "fade" | "slide" }',
    "",
    "## Block rules",
    "- block ids must be unique within a slide",
    "- table rows must match header length",
    "- targeted actions must reference visible block ids",
    "",
    "## Speaker note rules",
    '- "summary"?: string',
    '- "cues"?: string[]',
    '- "timing"?: string[]',
    '- "emphasis"?: string[]',
    '- "stepGuidance"?: array',
    "",
    "## Step guidance rules",
    '- "step": positive integer',
    '- "targetBlockId"?: visible by that step',
    '- "highlightTargetId"?: visible by that step',
    '- "highlightExitTiming"?: { "delayMs"?: number, "durationMs"?: number, "easing"?: string }',
      '- "appearTargetId"?: visible by that step',
      '- "appearExitTiming"?: { "delayMs"?: number, "durationMs"?: number, "easing"?: string }',
    '- "spotlight"?: { "x": number, "y": number, "radius": number, "shape"?: "auto" | "circle" | "pill" }',
    '- "spotlightShape"?: "auto" | "circle" | "pill"',
    '- "spotlightExitTiming"?: { "delayMs"?: number, "durationMs"?: number, "easing"?: string }',
    '- "laserPoints"?: [{ "x": number, "y": number }, ...] with at least two points',
    '- "laserAnchorFrom"?: "target" | "custom"',
    '- "laserExitTiming"?: { "delayMs"?: number, "durationMs"?: number, "easing"?: string }',
    "",
    "## Output reminder",
    "Output JSON only. Do not wrap it in markdown fences."
  ].join("\n");
}

export function buildMarkdownGenerationPrompt(options: PptPromptBuildOptions): string {
  return buildPrompt({
    task:
      options.language === "zh-CN"
        ? "\u8bf7\u6839\u636e\u4e0b\u65b9\u6e90\u5185\u5bb9\u751f\u6210\u4e00\u4efd\u517c\u5bb9 @civilization-os/ppt \u7684 markdown \u6f14\u793a\u7a3f\u3002"
        : "Generate markdown presentation source compatible with @civilization-os/ppt from the source below.",
    contract: getMarkdownSourceContract(options.language),
    source: options.source,
    presetId: options.presetId,
    mode: options.mode,
    extraInstructions: options.extraInstructions,
    outputReminder:
      options.language === "zh-CN"
        ? "\u6700\u7ec8\u53ea\u8f93\u51fa markdown \u6f14\u793a\u7a3f\u3002"
        : "Return markdown source only."
  });
}

export function buildDeckJsonGenerationPrompt(options: PptPromptBuildOptions): string {
  return buildPrompt({
    task:
      options.language === "zh-CN"
        ? "\u8bf7\u6839\u636e\u4e0b\u65b9\u6e90\u5185\u5bb9\u751f\u6210\u4e00\u4efd\u517c\u5bb9 @civilization-os/ppt \u7684 deck JSON\u3002"
        : "Generate deck JSON compatible with @civilization-os/ppt from the source below.",
    contract: getDeckJsonContract(),
    source: options.source,
    presetId: options.presetId,
    mode: options.mode,
    extraInstructions: options.extraInstructions,
    outputReminder:
      options.language === "zh-CN"
        ? "\u6700\u7ec8\u53ea\u8f93\u51fa JSON\uff0c\u4e0d\u8981\u5305\u88f9 markdown code fence\u3002"
        : "Return JSON only and do not wrap it in markdown code fences."
  });
}

function buildPrompt(options: {
  task: string;
  contract: string;
  source: string;
  presetId?: PptPresetId;
  mode?: "authoring" | "presenting";
  extraInstructions?: string;
  outputReminder: string;
}): string {
  const presetSection = options.presetId ? buildPresetSection(options.presetId) : [];
  const modeSection = buildModeSection(options.mode);

  return [
    options.task,
    "",
    ...presetSection,
    ...modeSection,
    "## Contract",
    options.contract,
    "",
    ...(options.extraInstructions ? ["## Extra Instructions", options.extraInstructions, ""] : []),
    "## Source",
    options.source.trim(),
    "",
    "## Final Requirement",
    options.outputReminder
  ].join("\n");
}

function buildModeSection(mode: "authoring" | "presenting" | undefined): string[] {
  if (!mode) {
    return [];
  }

  const rules =
    mode === "authoring"
      ? [
          "Prefer editability, structure clarity, and smoother office handoff.",
          "Bias toward stable sectioning, explicit summaries, and content completeness.",
          "Use speaker guidance only when it materially improves later revision or export."
        ]
      : [
          "Prefer live presentation flow, step progression, and speaker-oriented pacing.",
          "Bias toward explicit anchors, step guidance, and action-friendly block structure.",
          "Use notes, cues, spotlight, highlight, appear, and laser only when they improve stage delivery."
        ];

  return [
    "## Mode",
    `- ${mode}`,
    ...rules.map((rule) => `- ${rule}`),
    ""
  ];
}

function buildPresetSection(presetId: PptPresetId): string[] {
  const preset = requirePptPreset(presetId);
  const styleRules = getPresetStyleRules(presetId);

  return [
    "## Preset",
    `- id: ${preset.id}`,
    `- name: ${preset.name}`,
    `- description: ${preset.description}`,
    `- capabilities: ${preset.capabilities.join(", ")}`,
    ...styleRules.map((rule) => `- ${rule}`),
    ""
  ];
}

function getPresetStyleRules(presetId: PptPresetId): string[] {
  switch (presetId) {
    case "executive-report":
      return [
        "Prefer concise executive framing and restrained language.",
        "Bias toward metrics, tables, and comparison-oriented slides.",
        "Keep each slide focused on decisions, status, or operating takeaways."
      ];
    case "technical-brief":
      return [
        "Prefer precise technical language and denser information.",
        "Bias toward timelines, code/schema blocks, and two-column architecture explanations.",
        "Keep terminology stable and deterministic across slides."
      ];
    case "product-showcase":
      return [
        "Prefer visual storytelling and feature-oriented sequencing.",
        "Bias toward image-focus, metrics, and before/after or walkthrough structures.",
        "Keep slides demo-friendly and easier to narrate live."
      ];
  }
}
