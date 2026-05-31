import type { PptActionTiming, PptLanguage, PptSpeakerNotes, PptSpeakerStepGuidance } from "./types.js";

// ---------------------------------------------------------------------------
// Note field config — single source of truth for matchers, labels, and handlers
// ---------------------------------------------------------------------------

type NoteFieldHandler = {
  /** Parse matched value and apply to step guidance */
  applyStep: (guidance: PptSpeakerStepGuidance, value: string) => void;
  /** Parse matched value for generic (non-step) use */
  parseGeneric: (value: string) => string | undefined;
  /** Format a value into a step-guidance line */
  formatStep: (step: number, label: string, value: unknown, language: PptLanguage, guidance: PptSpeakerStepGuidance) => string | undefined;
};

type NoteFieldConfig = {
  id: string;
  enMatchers: RegExp[];
  zhMatchers: RegExp[];
  enLabel: string;
  zhLabel: string;
  stepOnly: boolean;
  exitVariant?: boolean;
  handler: NoteFieldHandler;
};

function applyTextGuidance(guidance: PptSpeakerStepGuidance, value: string, key: "cue" | "timing" | "emphasis"): void {
  const parsed = extractTargetBinding(value);
  (guidance as Record<string, unknown>)[key] = parsed.value;
  if (parsed.targetBlockId) {
    guidance.targetBlockId = parsed.targetBlockId;
  }
}

function applyTimingGuidance(guidance: PptSpeakerStepGuidance, value: string, key: "highlightTiming" | "appearTiming" | "spotlightTiming" | "laserTiming"): void {
  (guidance as Record<string, unknown>)[key] = parseActionTimingValue(value);
}

function applyExitTimingGuidance(guidance: PptSpeakerStepGuidance, value: string, key: "highlightExitTiming" | "appearExitTiming" | "spotlightExitTiming" | "laserExitTiming"): void {
  (guidance as Record<string, unknown>)[key] = parseActionTimingValue(value);
}

function applyTargetGuidance(guidance: PptSpeakerStepGuidance, value: string, key: "highlightTargetId" | "appearTargetId"): void {
  (guidance as Record<string, unknown>)[key] = extractRequiredTargetBinding(value);
}

function applySpotlightGuidance(guidance: PptSpeakerStepGuidance, value: string): void {
  const targetOnly = value.match(/^\[([^\]]+)\]\s*$/);

  if (targetOnly) {
    guidance.spotlightTargetId = targetOnly[1].trim();
    return;
  }

  guidance.spotlight = parseSpotlightValue(value);
}

function applyLaserGuidance(guidance: PptSpeakerStepGuidance, value: string): void {
  guidance.laserPoints = parseLaserValue(value);
}

function applySpotlightShapeGuidance(guidance: PptSpeakerStepGuidance, value: string): void {
  guidance.spotlightShape = parseSpotlightShapeValue(value);
}

function applyLaserAnchorGuidance(guidance: PptSpeakerStepGuidance, value: string): void {
  guidance.laserAnchorFrom = parseLaserAnchorFromValue(value);
}

// Generic (non-step) parsers
function genericTextParser(value: string): string | undefined {
  return extractTargetBinding(value).value;
}

function genericPassthrough(value: string): string | undefined {
  return value.trim() || undefined;
}

// Formatters
function formatTextStep(step: number, label: string, value: unknown, language: PptLanguage, guidance: PptSpeakerStepGuidance): string | undefined {
  return formatStepGuidanceLine(step, label, String(value), language, guidance.targetBlockId);
}

function formatActionStep(step: number, label: string, value: unknown, language: PptLanguage, _guidance: PptSpeakerStepGuidance): string | undefined {
  return formatStepActionLine(step, label, String(value), language);
}

function formatTimingStep(step: number, label: string, value: unknown, language: PptLanguage, _guidance: PptSpeakerStepGuidance): string | undefined {
  return formatStepActionTimingLine(step, label, value as PptActionTiming, language);
}

function formatExitTimingStep(step: number, label: string, value: unknown, language: PptLanguage, _guidance: PptSpeakerStepGuidance): string | undefined {
  return formatStepActionTimingLine(step, label, value as PptActionTiming, language, { exit: true });
}

function formatSpotlightStep(step: number, label: string, value: unknown, language: PptLanguage, _guidance: PptSpeakerStepGuidance): string | undefined {
  if (_guidance.spotlightTargetId) {
    return formatStepActionLine(step, label, _guidance.spotlightTargetId, language);
  }

  return formatStepSpotlightLine(step, label, value as { x: number; y: number; radius: number }, language);
}

function formatLaserStep(step: number, label: string, value: unknown, language: PptLanguage, _guidance: PptSpeakerStepGuidance): string | undefined {
  return formatStepLaserLine(step, label, value as Array<{ x: number; y: number }>, language);
}

function formatEnumStep(step: number, label: string, value: unknown, language: PptLanguage, _guidance: PptSpeakerStepGuidance): string | undefined {
  return formatStepGenericLine(step, label, String(value), language);
}

const noteFieldConfigs: NoteFieldConfig[] = [
  {
    id: "cue",
    enMatchers: [/^cues?\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u63d0\u793a\s*[:\uff1a]\s*/, /^\u8bb2\u8ff0\u63d0\u793a\s*[:\uff1a]\s*/],
    enLabel: "Cues",
    zhLabel: "\u63d0\u793a",
    stepOnly: false,
    handler: {
      applyStep: (g, v) => applyTextGuidance(g, v, "cue"),
      parseGeneric: genericTextParser,
      formatStep: formatTextStep
    }
  },
  {
    id: "timing",
    enMatchers: [/^timing\s*[:\uff1a]\s*/i, /^pace\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u65f6\u673a\s*[:\uff1a]\s*/, /^\u8282\u594f\s*[:\uff1a]\s*/],
    enLabel: "Timing",
    zhLabel: "\u8282\u594f",
    stepOnly: false,
    handler: {
      applyStep: (g, v) => applyTextGuidance(g, v, "timing"),
      parseGeneric: genericTextParser,
      formatStep: formatTextStep
    }
  },
  {
    id: "emphasis",
    enMatchers: [/^emphasis\s*[:\uff1a]\s*/i, /^stress\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u5f3a\u8c03\s*[:\uff1a]\s*/],
    enLabel: "Emphasis",
    zhLabel: "\u5f3a\u8c03",
    stepOnly: false,
    handler: {
      applyStep: (g, v) => applyTextGuidance(g, v, "emphasis"),
      parseGeneric: genericTextParser,
      formatStep: formatTextStep
    }
  },
  {
    id: "highlightTargetId",
    enMatchers: [/^highlight\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u9ad8\u4eae\s*[:\uff1a]\s*/],
    enLabel: "Highlight",
    zhLabel: "\u9ad8\u4eae",
    stepOnly: true,
    handler: {
      applyStep: (g, v) => applyTargetGuidance(g, v, "highlightTargetId"),
      parseGeneric: genericPassthrough,
      formatStep: formatActionStep
    }
  },
  {
    id: "appearTargetId",
    enMatchers: [/^appear\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u51fa\u73b0\s*[:\uff1a]\s*/],
    enLabel: "Appear",
    zhLabel: "\u51fa\u73b0",
    stepOnly: true,
    handler: {
      applyStep: (g, v) => applyTargetGuidance(g, v, "appearTargetId"),
      parseGeneric: genericPassthrough,
      formatStep: formatActionStep
    }
  },
  {
    id: "spotlight",
    enMatchers: [/^spotlight\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u805a\u5149\u706f\s*[:\uff1a]\s*/],
    enLabel: "Spotlight",
    zhLabel: "\u805a\u5149\u706f",
    stepOnly: true,
    handler: {
      applyStep: applySpotlightGuidance,
      parseGeneric: genericPassthrough,
      formatStep: formatSpotlightStep
    }
  },
  {
    id: "spotlightShape",
    enMatchers: [/^spotlight\s+shape\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u805a\u5149\u706f\u5f62\u6001\s*[:\uff1a]\s*/, /^\u805a\u5149\u706f\u5f62\u72b6\s*[:\uff1a]\s*/],
    enLabel: "Spotlight Shape",
    zhLabel: "\u805a\u5149\u706f\u5f62\u6001",
    stepOnly: true,
    handler: {
      applyStep: applySpotlightShapeGuidance,
      parseGeneric: genericPassthrough,
      formatStep: formatEnumStep
    }
  },
  {
    id: "laserPoints",
    enMatchers: [/^laser\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u6fc0\u5149\s*[:\uff1a]\s*/],
    enLabel: "Laser",
    zhLabel: "\u6fc0\u5149",
    stepOnly: true,
    handler: {
      applyStep: applyLaserGuidance,
      parseGeneric: genericPassthrough,
      formatStep: formatLaserStep
    }
  },
  {
    id: "laserAnchorFrom",
    enMatchers: [/^laser\s+anchor\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u6fc0\u5149\u951a\u70b9\s*[:\uff1a]\s*/, /^\u6fc0\u5149\u8d77\u70b9\s*[:\uff1a]\s*/],
    enLabel: "Laser Anchor",
    zhLabel: "\u6fc0\u5149\u951a\u70b9",
    stepOnly: true,
    handler: {
      applyStep: applyLaserAnchorGuidance,
      parseGeneric: genericPassthrough,
      formatStep: formatEnumStep
    }
  },
  {
    id: "highlightTiming",
    enMatchers: [/^highlight\s+timing\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u9ad8\u4eae\u8282\u594f\s*[:\uff1a]\s*/],
    enLabel: "Highlight Timing",
    zhLabel: "\u9ad8\u4eae\u8282\u594f",
    stepOnly: true,
    handler: {
      applyStep: (g, v) => applyTimingGuidance(g, v, "highlightTiming"),
      parseGeneric: genericPassthrough,
      formatStep: formatTimingStep
    }
  },
  {
    id: "appearTiming",
    enMatchers: [/^appear\s+timing\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u51fa\u73b0\u8282\u594f\s*[:\uff1a]\s*/],
    enLabel: "Appear Timing",
    zhLabel: "\u51fa\u73b0\u8282\u594f",
    stepOnly: true,
    handler: {
      applyStep: (g, v) => applyTimingGuidance(g, v, "appearTiming"),
      parseGeneric: genericPassthrough,
      formatStep: formatTimingStep
    }
  },
  {
    id: "spotlightTiming",
    enMatchers: [/^spotlight\s+timing\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u805a\u5149\u706f\u8282\u594f\s*[:\uff1a]\s*/],
    enLabel: "Spotlight Timing",
    zhLabel: "\u805a\u5149\u706f\u8282\u594f",
    stepOnly: true,
    handler: {
      applyStep: (g, v) => applyTimingGuidance(g, v, "spotlightTiming"),
      parseGeneric: genericPassthrough,
      formatStep: formatTimingStep
    }
  },
  {
    id: "laserTiming",
    enMatchers: [/^laser\s+timing\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u6fc0\u5149\u8282\u594f\s*[:\uff1a]\s*/],
    enLabel: "Laser Timing",
    zhLabel: "\u6fc0\u5149\u8282\u594f",
    stepOnly: true,
    handler: {
      applyStep: (g, v) => applyTimingGuidance(g, v, "laserTiming"),
      parseGeneric: genericPassthrough,
      formatStep: formatTimingStep
    }
  },
  {
    id: "highlightExitTiming",
    enMatchers: [/^highlight\s+exit\s+timing\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u9ad8\u4eae\u9000\u51fa\u8282\u594f\s*[:\uff1a]\s*/],
    enLabel: "Highlight Exit Timing",
    zhLabel: "\u9ad8\u4eae\u9000\u51fa\u8282\u594f",
    stepOnly: true,
    exitVariant: true,
    handler: {
      applyStep: (g, v) => applyExitTimingGuidance(g, v, "highlightExitTiming"),
      parseGeneric: genericPassthrough,
      formatStep: formatExitTimingStep
    }
  },
  {
    id: "appearExitTiming",
    enMatchers: [/^appear\s+exit\s+timing\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u51fa\u73b0\u9000\u51fa\u8282\u594f\s*[:\uff1a]\s*/],
    enLabel: "Appear Exit Timing",
    zhLabel: "\u51fa\u73b0\u9000\u51fa\u8282\u594f",
    stepOnly: true,
    exitVariant: true,
    handler: {
      applyStep: (g, v) => applyExitTimingGuidance(g, v, "appearExitTiming"),
      parseGeneric: genericPassthrough,
      formatStep: formatExitTimingStep
    }
  },
  {
    id: "spotlightExitTiming",
    enMatchers: [/^spotlight\s+exit\s+timing\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u805a\u5149\u706f\u9000\u51fa\u8282\u594f\s*[:\uff1a]\s*/],
    enLabel: "Spotlight Exit Timing",
    zhLabel: "\u805a\u5149\u706f\u9000\u51fa\u8282\u594f",
    stepOnly: true,
    exitVariant: true,
    handler: {
      applyStep: (g, v) => applyExitTimingGuidance(g, v, "spotlightExitTiming"),
      parseGeneric: genericPassthrough,
      formatStep: formatExitTimingStep
    }
  },
  {
    id: "laserExitTiming",
    enMatchers: [/^laser\s+exit\s+timing\s*[:\uff1a]\s*/i],
    zhMatchers: [/^\u6fc0\u5149\u9000\u51fa\u8282\u594f\s*[:\uff1a]\s*/],
    enLabel: "Laser Exit Timing",
    zhLabel: "\u6fc0\u5149\u9000\u51fa\u8282\u594f",
    stepOnly: true,
    exitVariant: true,
    handler: {
      applyStep: (g, v) => applyExitTimingGuidance(g, v, "laserExitTiming"),
      parseGeneric: genericPassthrough,
      formatStep: formatExitTimingStep
    }
  }
];

/** All matchers for a field (en + zh combined) */
function getFieldMatchers(field: NoteFieldConfig): RegExp[] {
  return [...field.enMatchers, ...field.zhMatchers];
}

/** Get the step-bound configs (for the parse loop) */
function getStepFieldConfigs(): NoteFieldConfig[] {
  return noteFieldConfigs.filter((f) => f.stepOnly);
}

/** Get all non-step configs (cue, timing, emphasis) */
function getGenericFieldConfigs(): NoteFieldConfig[] {
  return noteFieldConfigs.filter((f) => !f.stepOnly);
}

// ---------------------------------------------------------------------------
// Speaker note markers (used by extract/ strip)
// ---------------------------------------------------------------------------

const speakerNoteMarkers = ["Speaker note", "Speaker notes", "\u8bb2\u8005\u5907\u6ce8", "\u6f14\u8bb2\u5907\u6ce8"];
const speakerNoteMarkerPattern = new RegExp(
  `(?:${speakerNoteMarkers.map(escapeForRegex).join("|")})\\s*[:\\uff1a]\\s*([\\s\\S]*?)(?=\\n\\s*---|\\n#|\\n##|\\n###|$)`,
  "i"
);
const speakerNoteMarkerPatternGlobal = new RegExp(
  `(?:${speakerNoteMarkers.map(escapeForRegex).join("|")})\\s*[:\\uff1a]\\s*([\\s\\S]*?)(?=\\n\\s*---|\\n#|\\n##|\\n###|$)`,
  "gi"
);

export function extractSpeakerNotesRaw(content: string): string | undefined {
  const match = content.match(speakerNoteMarkerPattern);
  return match?.[1]?.trim() || undefined;
}

export function stripSpeakerNotes(content: string): string {
  return content.replace(speakerNoteMarkerPatternGlobal, "").trim();
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

export function parseSpeakerNotesText(content: string): PptSpeakerNotes {
  const raw = content.trim();

  if (!raw) {
    return {};
  }

  const summaryLines: string[] = [];
  const cues: string[] = [];
  const timing: string[] = [];
  const emphasis: string[] = [];
  const stepGuidance = new Map<number, PptSpeakerStepGuidance>();
  const genericConfigs = getGenericFieldConfigs();

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line) {
      continue;
    }

    const stepMatch = extractStepBinding(line);
    const scopedLine = stepMatch ? stepMatch.remainder : line;

    // Try generic fields first (cue, timing, emphasis)
    let matched = false;
    for (const config of genericConfigs) {
      const value = stripPrefix(scopedLine, getFieldMatchers(config));

      if (value === undefined) {
        continue;
      }

      matched = true;
      const parsed = config.handler.parseGeneric(value) ?? value;

      if (stepMatch) {
        const guidance = stepGuidance.get(stepMatch.step) ?? { step: stepMatch.step };
        config.handler.applyStep(guidance, value);
        stepGuidance.set(stepMatch.step, guidance);
      } else {
        // Push to the appropriate generic list
        switch (config.id) {
          case "cue":
            cues.push(parsed);
            break;
          case "timing":
            timing.push(parsed);
            break;
          case "emphasis":
            emphasis.push(parsed);
            break;
        }
      }
      break;
    }

    if (matched) {
      continue;
    }

    // Try step-only fields (only when step-bound)
    if (stepMatch) {
      let stepMatched = false;

      for (const config of getStepFieldConfigs()) {
        const value = stripPrefix(scopedLine, getFieldMatchers(config));

        if (value === undefined) {
          continue;
        }

        stepMatched = true;
        const guidance = stepGuidance.get(stepMatch.step) ?? { step: stepMatch.step };
        config.handler.applyStep(guidance, value);
        stepGuidance.set(stepMatch.step, guidance);
        break;
      }

      if (stepMatched) {
        continue;
      }
    }

    // Summary fallback: lines that don't match any field are treated as summary
    const summaryMatchers = [/^summary\s*[:\uff1a]\s*/i, /^\u6458\u8981\s*[:\uff1a]\s*/, /^\u6982\u8ff0\s*[:\uff1a]\s*/];
    const summaryValue = stripPrefix(line, summaryMatchers);
    summaryLines.push(summaryValue ?? line);
  }

  return compactSpeakerNotes({
    summary: summaryLines.length > 0 ? summaryLines.join("\n").trim() : undefined,
    cues,
    timing,
    emphasis,
    stepGuidance: [...stepGuidance.values()].sort((left, right) => left.step - right.step),
    raw
  });
}

// ---------------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------------

export function formatSpeakerNotes(notes: PptSpeakerNotes | undefined, language: PptLanguage): string | undefined {
  if (!notes) {
    return undefined;
  }

  const labels = getSpeakerNoteLabels(language);
  const parts: string[] = [];

  if (notes.summary) {
    parts.push(`${labels.summary}: ${notes.summary}`);
  }

  if (notes.cues && notes.cues.length > 0) {
    parts.push(`${labels.cues}:\n${notes.cues.map((item) => `- ${item}`).join("\n")}`);
  }

  if (notes.timing && notes.timing.length > 0) {
    parts.push(`${labels.timing}:\n${notes.timing.map((item) => `- ${item}`).join("\n")}`);
  }

  if (notes.emphasis && notes.emphasis.length > 0) {
    parts.push(`${labels.emphasis}:\n${notes.emphasis.map((item) => `- ${item}`).join("\n")}`);
  }

  if (notes.stepGuidance && notes.stepGuidance.length > 0) {
    const stepLines = notes.stepGuidance.flatMap((guidance) => {
      const lines: string[] = [];

      for (const config of noteFieldConfigs) {
        const value = (guidance as Record<string, unknown>)[config.id];

        if (value === undefined || value === null) {
          continue;
        }

        const label = getFieldLabel(config, language);
        const line = config.handler.formatStep(guidance.step, label, value, language, guidance);

        if (line) {
          lines.push(line);
        }
      }

      return lines;
    });

    if (stepLines.length > 0) {
      parts.push(stepLines.join("\n"));
    }
  }

  if (parts.length === 0 && notes.raw) {
    return notes.raw;
  }

  return parts.length > 0 ? parts.join("\n\n") : undefined;
}

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

export function getSpeakerNoteLabels(language: PptLanguage) {
  const result: Record<string, string> = {};

  for (const config of noteFieldConfigs) {
    const label = getFieldLabel(config, language);
    // Preserve backward-compatible key names
    if (config.id === "cue") {
      result.cues = label;           // "cue" → "cues" (plural)
    } else if (config.id === "highlightTargetId") {
      result.highlight = label;      // "highlightTargetId" → "highlight"
    } else if (config.id === "appearTargetId") {
      result.appear = label;         // "appearTargetId" → "appear"
    } else if (config.id === "laserPoints") {
      result.laser = label;          // "laserPoints" → "laser"
    } else {
      result[config.id] = label;
    }
  }

  // Add extra labels not in the field config
  if (language === "zh-CN") {
    result.summary = "\u6458\u8981";
    result.stepGuidance = "\u6b65\u9aa4\u7ed1\u5b9a";
    result.targetBlock = "\u76ee\u6807\u5757";
    result.none = "\u65e0\u5907\u6ce8";
  } else {
    result.summary = "Summary";
    result.stepGuidance = "Step Guidance";
    result.targetBlock = "Target Block";
    result.none = "No notes.";
  }

  return result as {
    summary: string;
    cues: string;
    timing: string;
    emphasis: string;
    highlight: string;
    appear: string;
    spotlight: string;
    laser: string;
    stepGuidance: string;
    targetBlock: string;
    none: string;
  };
}

function getFieldLabel(config: NoteFieldConfig, language: PptLanguage): string {
  return language === "zh-CN" ? config.zhLabel : config.enLabel;
}

// ---------------------------------------------------------------------------
// Compact
// ---------------------------------------------------------------------------

export function compactSpeakerNotes(notes: PptSpeakerNotes): PptSpeakerNotes {
  return {
    summary: notes.summary?.trim() || undefined,
    cues: normalizeNoteList(notes.cues),
    timing: normalizeNoteList(notes.timing),
    emphasis: normalizeNoteList(notes.emphasis),
    stepGuidance: normalizeStepGuidance(notes.stepGuidance),
    raw: notes.raw?.trim() || undefined
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function normalizeNoteList(values: string[] | undefined): string[] | undefined {
  const normalized = values?.map((value) => value.trim()).filter(Boolean);
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeStepGuidance(values: PptSpeakerStepGuidance[] | undefined): PptSpeakerStepGuidance[] | undefined {
  if (!values || values.length === 0) {
    return undefined;
  }

  const merged = new Map<number, PptSpeakerStepGuidance>();

  for (const entry of values) {
    if (!Number.isInteger(entry.step) || entry.step < 1) {
      continue;
    }

    const current = merged.get(entry.step) ?? { step: entry.step };

    if (entry.cue?.trim()) {
      current.cue = entry.cue.trim();
    }

    if (entry.timing?.trim()) {
      current.timing = entry.timing.trim();
    }

    if (entry.emphasis?.trim()) {
      current.emphasis = entry.emphasis.trim();
    }

    if (entry.targetBlockId?.trim()) {
      current.targetBlockId = entry.targetBlockId.trim();
    }

    if (entry.highlightTargetId?.trim()) {
      current.highlightTargetId = entry.highlightTargetId.trim();
    }

    if (entry.highlightTiming) {
      current.highlightTiming = entry.highlightTiming;
    }

    if (entry.highlightExitTiming) {
      current.highlightExitTiming = entry.highlightExitTiming;
    }

    if (entry.appearTargetId?.trim()) {
      current.appearTargetId = entry.appearTargetId.trim();
    }

    if (entry.appearTiming) {
      current.appearTiming = entry.appearTiming;
    }

    if (entry.appearExitTiming) {
      current.appearExitTiming = entry.appearExitTiming;
    }

    if (entry.spotlight) {
      current.spotlight = entry.spotlight;
    }

    if (entry.spotlightShape) {
      current.spotlightShape = entry.spotlightShape;
    }

    if (entry.spotlightTargetId?.trim()) {
      current.spotlightTargetId = entry.spotlightTargetId.trim();
    }

    if (entry.spotlightTiming) {
      current.spotlightTiming = entry.spotlightTiming;
    }

    if (entry.spotlightExitTiming) {
      current.spotlightExitTiming = entry.spotlightExitTiming;
    }

    if (entry.laserPoints && entry.laserPoints.length > 0) {
      current.laserPoints = entry.laserPoints;
    }

    if (entry.laserAnchorFrom) {
      current.laserAnchorFrom = entry.laserAnchorFrom;
    }

    if (entry.laserTiming) {
      current.laserTiming = entry.laserTiming;
    }

    if (entry.laserExitTiming) {
      current.laserExitTiming = entry.laserExitTiming;
    }

    merged.set(entry.step, current);
  }

  const normalized = [...merged.values()]
    .filter(
      (entry) =>
        entry.cue ||
        entry.timing ||
        entry.emphasis ||
        entry.targetBlockId ||
        entry.highlightTargetId ||
        entry.highlightTiming ||
        entry.highlightExitTiming ||
        entry.appearTargetId ||
        entry.appearTiming ||
        entry.appearExitTiming ||
        entry.spotlightTargetId ||
        entry.spotlight ||
        entry.spotlightShape ||
        entry.spotlightTiming ||
        entry.spotlightExitTiming ||
        entry.laserAnchorFrom ||
        entry.laserTiming ||
        entry.laserExitTiming ||
        (entry.laserPoints && entry.laserPoints.length > 0)
    )
    .sort((left, right) => left.step - right.step);

  return normalized.length > 0 ? normalized : undefined;
}

function stripPrefix(value: string, matchers: RegExp[]): string | undefined {
  for (const matcher of matchers) {
    if (matcher.test(value)) {
      return value.replace(matcher, "").trim() || undefined;
    }
  }

  return undefined;
}

function extractStepBinding(value: string): { step: number; remainder: string } | undefined {
  const english = value.match(/^step\s*(\d+)\s+/i);

  if (english) {
    return {
      step: Number(english[1]),
      remainder: value.slice(english[0].length).trim()
    };
  }

  const chinese = value.match(/^\u7b2c\s*(\d+)\s*\u6b65\s*/);

  if (chinese) {
    return {
      step: Number(chinese[1]),
      remainder: value.slice(chinese[0].length).trim()
    };
  }

  return undefined;
}

function extractTargetBinding(value: string): { targetBlockId?: string; value: string } {
  const match = value.match(/^\[([^\]]+)\]\s*(.+)$/);

  if (!match) {
    return { value: value.trim() };
  }

  return {
    targetBlockId: match[1].trim(),
    value: match[2].trim()
  };
}

function extractRequiredTargetBinding(value: string): string {
  const match = value.match(/^\[([^\]]+)\]\s*$/);

  if (!match) {
    return value.trim();
  }

  return match[1].trim();
}

function formatStepGuidanceLine(
  step: number,
  label: string,
  value: string,
  language: PptLanguage,
  targetBlockId?: string
): string {
  const target = targetBlockId ? ` [${targetBlockId}]` : "";

  if (language === "zh-CN") {
    return `\u7b2c${step}\u6b65 ${label}\uff1a${target}${value}`;
  }

  return `Step ${step} ${label}:${target} ${value}`.trim();
}

function formatStepActionLine(step: number, label: string, targetBlockId: string, language: PptLanguage): string {
  if (language === "zh-CN") {
    return `\u7b2c${step}\u6b65 ${label}\uff1a[${targetBlockId}]`;
  }

  return `Step ${step} ${label}: [${targetBlockId}]`;
}

function formatStepGenericLine(step: number, label: string, value: string, language: PptLanguage): string {
  if (language === "zh-CN") {
    return `\u7b2c${step}\u6b65 ${label}\uff1a${value}`;
  }

  return `Step ${step} ${label}: ${value}`;
}

function formatStepActionTimingLine(
  step: number,
  label: string,
  timing: PptActionTiming,
  language: PptLanguage,
  options: { exit?: boolean } = {}
): string {
  const value = [timing.delayMs, timing.durationMs, timing.easing].filter((item) => item !== undefined && item !== "").join(", ");

  if (language === "zh-CN") {
    return `\u7b2c${step}\u6b65 ${label}${options.exit ? "\u9000\u51fa" : ""}\u8282\u594f\uff1a${value}`;
  }

  return `Step ${step} ${label}${options.exit ? " Exit" : ""} Timing: ${value}`;
}

function formatStepSpotlightLine(
  step: number,
  label: string,
  spotlight: { x: number; y: number; radius: number },
  language: PptLanguage
): string {
  const value = `${spotlight.x}, ${spotlight.y}, ${spotlight.radius}`;

  if (language === "zh-CN") {
    return `\u7b2c${step}\u6b65 ${label}\uff1a${value}`;
  }

  return `Step ${step} ${label}: ${value}`;
}

function formatStepLaserLine(
  step: number,
  label: string,
  laserPoints: Array<{ x: number; y: number }>,
  language: PptLanguage
): string {
  const value = laserPoints.map((point) => `${point.x},${point.y}`).join(" -> ");

  if (language === "zh-CN") {
    return `\u7b2c${step}\u6b65 ${label}\uff1a${value}`;
  }

  return `Step ${step} ${label}: ${value}`;
}

function parseSpotlightValue(value: string): { x: number; y: number; radius: number } {
  const numbers = value
    .split(",")
    .map((item) => Number(item.trim()))
    .filter((item) => Number.isFinite(item));

  if (numbers.length !== 3) {
    throw new Error(`Invalid spotlight note value: "${value}". Expected "x, y, radius".`);
  }

  return {
    x: numbers[0],
    y: numbers[1],
    radius: numbers[2]
  };
}

function parseSpotlightShapeValue(value: string): "auto" | "circle" | "pill" {
  const normalized = value.trim().toLowerCase();

  if (normalized === "auto" || normalized === "circle" || normalized === "pill") {
    return normalized;
  }

  throw new Error(`Invalid spotlight shape note value: "${value}". Expected "auto", "circle", or "pill".`);
}

function parseLaserValue(value: string): Array<{ x: number; y: number }> {
  const points = value
    .split(/\s*->\s*/)
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const numbers = pair
        .split(",")
        .map((item) => Number(item.trim()))
        .filter((item) => Number.isFinite(item));

      if (numbers.length !== 2) {
        throw new Error(`Invalid laser point: "${pair}". Expected "x,y".`);
      }

      return {
        x: numbers[0],
        y: numbers[1]
      };
    });

  if (points.length < 2) {
    throw new Error(`Invalid laser note value: "${value}". Expected at least two points.`);
  }

  return points;
}

function parseLaserAnchorFromValue(value: string): "target" | "custom" {
  const normalized = value.trim().toLowerCase();

  if (normalized === "target" || normalized === "custom") {
    return normalized;
  }

  throw new Error(`Invalid laser anchor note value: "${value}". Expected "target" or "custom".`);
}

function parseActionTimingValue(value: string): PptActionTiming {
  const match = value.trim().match(/^([^,]+)\s*,\s*([^,]+)(?:\s*,\s*(.+))?$/);

  if (!match) {
    throw new Error(`Invalid action timing note value: "${value}". Expected "delayMs, durationMs, easing?"`);
  }

  const delayMs = Number(match[1]);
  const durationMs = Number(match[2]);

  if (!Number.isFinite(delayMs) || !Number.isFinite(durationMs)) {
    throw new Error(`Invalid action timing note value: "${value}". Delay and duration must be numbers.`);
  }

  const timing: PptActionTiming = {
    delayMs,
    durationMs
  };

  if (match[3]) {
    timing.easing = match[3].trim();
  }

  return timing;
}

function escapeForRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
