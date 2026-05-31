import { extractSpeakerNotesRaw, parseSpeakerNotesText, stripSpeakerNotes } from "../notes.js";
import type {
  PptAssetInput,
  PptDeckBlock,
  PptDeckComparisonItem,
  PptDeckMetricItem,
  PptDeckProcessItem,
  PptDeckQuadrantCell,
  PptDeckSlide,
  PptDeckStep,
  PptDeckTimelineItem,
  PptLanguage,
  PptSourceInput
} from "../types.js";

// ---------------------------------------------------------------------------
// RawBlock — intermediate parse state before conversion to PptDeckBlock
// ---------------------------------------------------------------------------

export type RawBlock =
  | { kind: "heading"; text: string; anchorId?: string }
  | { kind: "text"; text: string; anchorId?: string }
  | { kind: "bullets"; items: string[]; anchorId?: string; itemAnchors?: Record<number, string> }
  | { kind: "callout"; text: string; anchorId?: string }
  | { kind: "metrics"; items: PptDeckMetricItem[]; anchorId?: string }
  | { kind: "two-column"; left: string; right: string; anchorId?: string }
  | { kind: "timeline"; items: PptDeckTimelineItem[]; anchorId?: string }
  | { kind: "process"; items: PptDeckProcessItem[]; anchorId?: string }
  | {
      kind: "quadrant";
      xLabel?: string;
      yLabel?: string;
      topLeft: PptDeckQuadrantCell;
      topRight: PptDeckQuadrantCell;
      bottomLeft: PptDeckQuadrantCell;
      bottomRight: PptDeckQuadrantCell;
      anchorId?: string;
    }
  | { kind: "comparison"; leftTitle: string; rightTitle: string; items: PptDeckComparisonItem[]; anchorId?: string }
  | { kind: "quote"; text: string; anchorId?: string }
  | { kind: "code"; code: string; language?: string; anchorId?: string }
  | { kind: "table"; headers: string[]; rows: string[][]; anchorId?: string }
  | { kind: "image"; asset: PptAssetInput; caption?: string; anchorId?: string };

// ---------------------------------------------------------------------------
// Markdown → slides
// ---------------------------------------------------------------------------

export function parseMarkdownToChunks(content: string): string[] {
  return content
    .split(/^\s*---\s*$/m)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

export function createSlideFromMarkdownChunk(chunk: string, index: number): PptDeckSlide {
  const noteText = extractSpeakerNotesRaw(chunk);
  const notes = noteText ? parseSpeakerNotesText(noteText) : undefined;
  const content = stripSpeakerNotes(chunk);
  const rawBlocks = parseMarkdownBlocks(content);
  const title = findSlideTitle(rawBlocks) ?? `Slide ${index + 1}`;
  const steps = applyStepGuidanceActions(
    rawBlocks.map((block, blockIndex) => ({
      id: `slide-${index + 1}-step-${blockIndex + 1}`,
      blocks: [blockFromRaw(block, `${index + 1}-${blockIndex + 1}`)],
      transition: {
        kind: blockIndex === 0 ? "none" : "fade"
      }
    })),
    notes
  );

  return {
    id: `slide-${index + 1}`,
    title,
    notes,
    steps: steps.length > 0 ? steps : [createFallbackStep(index)]
  };
}

// ---------------------------------------------------------------------------
// Block parsers
// ---------------------------------------------------------------------------

export function findSlideTitle(blocks: RawBlock[]): string | undefined {
  const heading = blocks.find((block) => block.kind === "heading");
  return heading?.kind === "heading" ? heading.text : undefined;
}

export function parseMarkdownBlocks(content: string): RawBlock[] {
  const lines = content.split(/\r?\n/);
  const blocks: RawBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const parsedFence = parseTrailingAnchor(trimmed.slice(3).trim());
      const language = parsedFence.value || undefined;
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }

      blocks.push({
        kind: "code",
        code: codeLines.join("\n").trim(),
        language,
        anchorId: parsedFence.anchorId
      });
      index += 1;
      continue;
    }

    const directiveBlock = parseDirectiveBlock(lines, index);

    if (directiveBlock) {
      blocks.push(directiveBlock.block);
      index = directiveBlock.nextIndex;
      continue;
    }

    const markdownImage = parseMarkdownImage(trimmed);

    if (markdownImage) {
      blocks.push(markdownImage);
      index += 1;
      continue;
    }

    if (trimmed.startsWith("#")) {
      const parsedHeading = parseTrailingAnchor(trimmed.replace(/^#+\s*/, ""));
      blocks.push({
        kind: "heading",
        text: parsedHeading.value,
        anchorId: parsedHeading.anchorId
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];

      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }

      const parsedQuote = parseTrailingAnchor(quoteLines[quoteLines.length - 1] ?? "");
      if (quoteLines.length > 0) {
        quoteLines[quoteLines.length - 1] = parsedQuote.value;
      }

      blocks.push({
        kind: "quote",
        text: quoteLines.join(" ").trim(),
        anchorId: parsedQuote.anchorId
      });
      continue;
    }

    if (trimmed.startsWith("- ") || /^\d+\.\s+/.test(trimmed)) {
      while (index < lines.length) {
        const itemLine = lines[index].trim();
        if (!(itemLine.startsWith("- ") || /^\d+\.\s+/.test(itemLine))) break;

        const raw = itemLine.replace(/^-\s+/, "").replace(/^\d+\.\s+/, "").trim();
        const parsed = parseTrailingAnchor(raw);

        blocks.push({
          kind: "bullets",
          items: [parsed.value],
          anchorId: parsed.anchorId
        });
        index += 1;
      }
      continue;
    }

    if (isTableRow(trimmed) && index + 1 < lines.length && isTableSeparator(lines[index + 1].trim())) {
      const tableLines = [trimmed];
      index += 2;

      while (index < lines.length && isTableRow(lines[index].trim())) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      blocks.push(parseTableBlock(tableLines));
      continue;
    }

    const paragraphLines: string[] = [trimmed];
    index += 1;

    while (index < lines.length) {
      const next = lines[index].trim();

      if (!next || next.startsWith("#") || next.startsWith(">") || next.startsWith("- ") || /^\d+\.\s+/.test(next) || next.startsWith("```")) {
        break;
      }

      if (isTableRow(next) && index + 1 < lines.length && isTableSeparator(lines[index + 1].trim())) {
        break;
      }

      paragraphLines.push(next);
      index += 1;
    }

    const parsedParagraph = parseTrailingAnchor(paragraphLines[paragraphLines.length - 1] ?? "");
    if (paragraphLines.length > 0) {
      paragraphLines[paragraphLines.length - 1] = parsedParagraph.value;
    }

    blocks.push({
      kind: "text",
      text: paragraphLines.join(" ").trim(),
      anchorId: parsedParagraph.anchorId
    });
  }

  return blocks;
}

// ---------------------------------------------------------------------------
// RawBlock → PptDeckBlock
// ---------------------------------------------------------------------------

export function blockFromRaw(block: RawBlock, suffix: string): PptDeckBlock {
  switch (block.kind) {
    case "heading":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "heading",
        text: block.text
      };
    case "text":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "text",
        text: block.text
      };
    case "bullets":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "bullets",
        items: block.items,
        itemAnchors: block.itemAnchors
      };
    case "callout":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "callout",
        text: block.text
      };
    case "metrics":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "metrics",
        items: block.items
      };
    case "two-column":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "two-column",
        left: block.left,
        right: block.right
      };
    case "timeline":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "timeline",
        items: block.items
      };
    case "process":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "process",
        items: block.items
      };
    case "quadrant":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "quadrant",
        ...(block.xLabel ? { xLabel: block.xLabel } : {}),
        ...(block.yLabel ? { yLabel: block.yLabel } : {}),
        topLeft: block.topLeft,
        topRight: block.topRight,
        bottomLeft: block.bottomLeft,
        bottomRight: block.bottomRight
      };
    case "comparison":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "comparison",
        leftTitle: block.leftTitle,
        rightTitle: block.rightTitle,
        items: block.items
      };
    case "quote":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "quote",
        text: block.text
      };
    case "code":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "code",
        code: block.code,
        language: block.language
      };
    case "table":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "table",
        headers: block.headers,
        rows: block.rows
      };
    case "image":
      return {
        id: block.anchorId ?? `block-${suffix}`,
        kind: "image",
        asset: block.asset,
        caption: block.caption
      };
  }
}

export function createFallbackStep(index: number) {
  return {
    id: `slide-${index + 1}-step-1`,
    blocks: [
      {
        id: `block-${index + 1}-fallback`,
        kind: "text" as const,
        text: "Empty slide"
      }
    ],
    transition: {
      kind: "none" as const
    }
  };
}

// ---------------------------------------------------------------------------
// Step guidance → actions
// ---------------------------------------------------------------------------

export function applyStepGuidanceActions(steps: PptDeckStep[], notes: PptDeckSlide["notes"]): PptDeckStep[] {
  if (!notes?.stepGuidance || notes.stepGuidance.length === 0) {
    return steps;
  }

  return steps.map((step, stepIndex) => {
    const guidance = notes.stepGuidance?.find((item) => item.step === stepIndex + 1);

    if (!guidance) {
      return step;
    }

    const actions = [...(step.actions ?? [])];

    if (guidance.highlightTargetId) {
      const existing = actions.find((action) => action.kind === "highlight" && action.targetId === guidance.highlightTargetId);

      if (existing) {
        if (guidance.highlightTiming) {
          existing.timing = guidance.highlightTiming;
        }
        if (guidance.highlightExitTiming) {
          existing.exitTiming = guidance.highlightExitTiming;
        }
      } else {
        actions.push({
          kind: "highlight",
          targetId: guidance.highlightTargetId,
          ...(guidance.highlightTiming ? { timing: guidance.highlightTiming } : {}),
          ...(guidance.highlightExitTiming ? { exitTiming: guidance.highlightExitTiming } : {})
        });
      }
    }

    if (guidance.appearTargetId) {
      const existing = actions.find((action) => action.kind === "appear" && action.targetId === guidance.appearTargetId);

      if (existing) {
        if (guidance.appearTiming) {
          existing.timing = guidance.appearTiming;
        }
        if (guidance.appearExitTiming) {
          existing.exitTiming = guidance.appearExitTiming;
        }
      } else {
        actions.push({
          kind: "appear",
          targetId: guidance.appearTargetId,
          ...(guidance.appearTiming ? { timing: guidance.appearTiming } : {}),
          ...(guidance.appearExitTiming ? { exitTiming: guidance.appearExitTiming } : {})
        });
      }
    }

    if (guidance.spotlight) {
      const existing = actions.find((action) => action.kind === "spotlight");

      if (existing) {
        existing.x = guidance.spotlight.x;
        existing.y = guidance.spotlight.y;
        existing.radius = guidance.spotlight.radius;
        if (guidance.spotlight.shape) {
          existing.shape = guidance.spotlight.shape;
        }
        if (guidance.spotlightShape) {
          existing.shape = guidance.spotlightShape;
        }
        if (guidance.spotlightTargetId) {
          existing.targetId = guidance.spotlightTargetId;
        }
        if (guidance.spotlightTiming) {
          existing.timing = guidance.spotlightTiming;
        }
        if (guidance.spotlightExitTiming) {
          existing.exitTiming = guidance.spotlightExitTiming;
        }
      } else {
        actions.push({
          kind: "spotlight",
          ...(guidance.spotlightTargetId ? { targetId: guidance.spotlightTargetId } : {}),
          x: guidance.spotlight.x,
          y: guidance.spotlight.y,
          radius: guidance.spotlight.radius,
          ...(guidance.spotlight.shape ? { shape: guidance.spotlight.shape } : {}),
          ...(guidance.spotlightShape ? { shape: guidance.spotlightShape } : {}),
          ...(guidance.spotlightTiming ? { timing: guidance.spotlightTiming } : {}),
          ...(guidance.spotlightExitTiming ? { exitTiming: guidance.spotlightExitTiming } : {})
        });
      }
    }

    if (guidance.spotlightTargetId && !guidance.spotlight) {
      const existing = actions.find((action) => action.kind === "spotlight" && action.targetId === guidance.spotlightTargetId);

      if (existing) {
        if (guidance.spotlightTiming) {
          existing.timing = guidance.spotlightTiming;
        }
        if (guidance.spotlightExitTiming) {
          existing.exitTiming = guidance.spotlightExitTiming;
        }
      } else {
        actions.push({
          kind: "spotlight",
          targetId: guidance.spotlightTargetId,
          ...(guidance.spotlightShape ? { shape: guidance.spotlightShape } : {}),
          ...(guidance.spotlightTiming ? { timing: guidance.spotlightTiming } : {}),
          ...(guidance.spotlightExitTiming ? { exitTiming: guidance.spotlightExitTiming } : {})
        });
      }
    }

    if (guidance.laserPoints && guidance.laserPoints.length > 0) {
      const existing = actions.find((action) => action.kind === "laser");

      if (existing) {
        existing.points = guidance.laserPoints;
        if (guidance.laserAnchorFrom) {
          existing.anchorFrom = guidance.laserAnchorFrom;
        }
        if (guidance.laserTiming) {
          existing.timing = guidance.laserTiming;
        }
        if (guidance.laserExitTiming) {
          existing.exitTiming = guidance.laserExitTiming;
        }
      } else {
        actions.push({
          kind: "laser",
          points: guidance.laserPoints,
          ...(guidance.laserAnchorFrom ? { anchorFrom: guidance.laserAnchorFrom } : {}),
          ...(guidance.laserTiming ? { timing: guidance.laserTiming } : {}),
          ...(guidance.laserExitTiming ? { exitTiming: guidance.laserExitTiming } : {})
        });
      }
    }

    return actions.length > 0
      ? {
          ...step,
          actions
        }
      : step;
  });
}

// ---------------------------------------------------------------------------
// Table parsing
// ---------------------------------------------------------------------------

export function renderTableAsText(headers: string[], rows: string[][]): string {
  const headerLine = headers.join(" | ");
  const rowLines = rows.map((row) => row.join(" | "));
  return [headerLine, ...rowLines].join("\n");
}

function parseTableBlock(lines: string[]): RawBlock {
  const parsedHeader = parseTrailingAnchor(lines[0]);
  const headers = splitTableRow(parsedHeader.value);
  const rows = lines.slice(1).map(splitTableRow);
  return {
    kind: "table",
    headers,
    rows,
    anchorId: parsedHeader.anchorId
  };
}

function splitTableRow(line: string): string[] {
  return line
    .split("|")
    .map((cell) => cell.trim())
    .filter((cell, index, cells) => !(cell === "" && (index === 0 || index === cells.length - 1)));
}

function isTableRow(line: string): boolean {
  return line.includes("|");
}

function isTableSeparator(line: string): boolean {
  return /^[:\-\|\s]+$/.test(line) && line.includes("-");
}

// ---------------------------------------------------------------------------
// Directive block parsing (::: callout / metrics / two-column / timeline / process / comparison :::)
// ---------------------------------------------------------------------------

function parseDirectiveBlock(lines: string[], startIndex: number): { block: RawBlock; nextIndex: number } | undefined {
  const opening = lines[startIndex].trim();
  const directiveMatch = opening.match(/^:::\s*(callout|metrics|two-column|timeline|process|quadrant|comparison)(?:\s+\{#([a-zA-Z0-9_-]+)\})?\s*$/i);

  if (!directiveMatch) {
    return undefined;
  }

  const directive = directiveMatch[1].toLowerCase();
  const anchorId = directiveMatch[2];
  const contentLines: string[] = [];
  let index = startIndex + 1;

  while (index < lines.length && lines[index].trim() !== ":::") {
    contentLines.push(lines[index]);
    index += 1;
  }

  const body = contentLines.join("\n").trim();

  if (directive === "callout") {
    return {
      block: {
        kind: "callout",
        text: body || "Callout",
        anchorId
      },
      nextIndex: Math.min(index + 1, lines.length)
    };
  }

  if (directive === "two-column") {
    return {
      block: parseTwoColumnBlock(body, anchorId),
      nextIndex: Math.min(index + 1, lines.length)
    };
  }

  if (directive === "timeline") {
    return {
      block: {
        kind: "timeline",
        items: parseTimelineItems(body),
        anchorId
      },
      nextIndex: Math.min(index + 1, lines.length)
    };
  }

  if (directive === "process") {
    return {
      block: {
        kind: "process",
        items: parseProcessItems(body),
        anchorId
      },
      nextIndex: Math.min(index + 1, lines.length)
    };
  }

  if (directive === "quadrant") {
    return {
      block: parseQuadrantBlock(body, anchorId),
      nextIndex: Math.min(index + 1, lines.length)
    };
  }

  if (directive === "comparison") {
    return {
      block: parseComparisonBlock(body, anchorId),
      nextIndex: Math.min(index + 1, lines.length)
    };
  }

  return {
    block: {
      kind: "metrics",
      items: parseMetricItems(body),
      anchorId
    },
    nextIndex: Math.min(index + 1, lines.length)
  };
}

function parseMetricItems(content: string): PptDeckMetricItem[] {
  const items = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, ""))
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return {
          label: line,
          value: "-"
        };
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        value: line.slice(separatorIndex + 1).trim() || "-"
      };
    });

  return items.length > 0 ? items : [{ label: "Value", value: "TBD" }];
}

function parseTwoColumnBlock(content: string, anchorId?: string): RawBlock {
  const lines = content.split(/\r?\n/);
  const leftLines: string[] = [];
  const rightLines: string[] = [];
  let side: "left" | "right" = "left";

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^left\s*:/i.test(line)) {
      side = "left";
      const value = line.replace(/^left\s*:/i, "").trim();
      if (value) {
        leftLines.push(value);
      }
      continue;
    }

    if (/^right\s*:/i.test(line)) {
      side = "right";
      const value = line.replace(/^right\s*:/i, "").trim();
      if (value) {
        rightLines.push(value);
      }
      continue;
    }

    if (side === "left") {
      leftLines.push(rawLine);
    } else {
      rightLines.push(rawLine);
    }
  }

  return {
    kind: "two-column",
    left: leftLines.join("\n").trim() || "Left column",
    right: rightLines.join("\n").trim() || "Right column",
    anchorId
  };
}

function parseTimelineItems(content: string): PptDeckTimelineItem[] {
  const items = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, ""))
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return {
          label: line,
          detail: "-"
        };
      }

      return {
        label: line.slice(0, separatorIndex).trim(),
        detail: line.slice(separatorIndex + 1).trim() || "-"
      };
    });

  return items.length > 0 ? items : [{ label: "Stage", detail: "TBD" }];
}

function parseComparisonBlock(content: string, anchorId?: string): RawBlock {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let leftTitle = "Left";
  let rightTitle = "Right";
  const items: PptDeckComparisonItem[] = [];

  for (const line of lines) {
    if (/^left\s*:/i.test(line)) {
      leftTitle = line.replace(/^left\s*:/i, "").trim() || leftTitle;
      continue;
    }

    if (/^right\s*:/i.test(line)) {
      rightTitle = line.replace(/^right\s*:/i, "").trim() || rightTitle;
      continue;
    }

    const normalized = line.replace(/^[-*]\s+/, "");
    const parts = normalized.split("|").map((part) => part.trim());

    if (parts.length >= 3) {
      items.push({
        label: parts[0],
        left: parts[1],
        right: parts[2]
      });
      continue;
    }

    const separatorIndex = normalized.indexOf(":");
    if (separatorIndex !== -1) {
      items.push({
        label: normalized.slice(0, separatorIndex).trim(),
        left: normalized.slice(separatorIndex + 1).trim() || "-",
        right: "-"
      });
    }
  }

  return {
    kind: "comparison",
    leftTitle,
    rightTitle,
    items: items.length > 0 ? items : [{ label: "Item", left: "-", right: "-" }],
    anchorId
  };
}

function parseProcessItems(content: string): PptDeckProcessItem[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, ""))
    .map((line) => {
      const separatorIndex = line.indexOf(":");

      if (separatorIndex === -1) {
        return {
          title: line,
          detail: ""
        };
      }

      return {
        title: line.slice(0, separatorIndex).trim(),
        detail: line.slice(separatorIndex + 1).trim()
      };
    })
    .filter((item) => item.title && item.detail);
}

function parseQuadrantBlock(content: string, anchorId?: string): RawBlock {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let xLabel: string | undefined;
  let yLabel: string | undefined;
  const cells = new Map<string, PptDeckQuadrantCell>();

  for (const line of lines) {
    const normalized = line.replace(/^[-*]\s+/, "");

    if (/^x-axis\s*:/i.test(normalized)) {
      xLabel = normalized.replace(/^x-axis\s*:/i, "").trim() || xLabel;
      continue;
    }

    if (/^y-axis\s*:/i.test(normalized)) {
      yLabel = normalized.replace(/^y-axis\s*:/i, "").trim() || yLabel;
      continue;
    }

    const match = normalized.match(/^(top-left|top-right|bottom-left|bottom-right)\s*:\s*(.+)$/i);

    if (!match) {
      continue;
    }

    const key = match[1].toLowerCase();
    const value = match[2].trim();
    const parts = value.split("|").map((part) => part.trim()).filter(Boolean);

    cells.set(key, {
      title: parts[0] || value,
      detail: parts[1] || "-"
    });
  }

  return {
    kind: "quadrant",
    anchorId,
    ...(xLabel ? { xLabel } : {}),
    ...(yLabel ? { yLabel } : {}),
    topLeft: cells.get("top-left") ?? { title: "Top left", detail: "-" },
    topRight: cells.get("top-right") ?? { title: "Top right", detail: "-" },
    bottomLeft: cells.get("bottom-left") ?? { title: "Bottom left", detail: "-" },
    bottomRight: cells.get("bottom-right") ?? { title: "Bottom right", detail: "-" }
  };
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function parseTrailingAnchor(value: string): { value: string; anchorId?: string } {
  const match = value.match(/^(.*?)(?:\s+\{#([a-zA-Z0-9_-]+)\})\s*$/);

  if (!match) {
    return { value: value.trim() };
  }

  return {
    value: match[1].trim(),
    anchorId: match[2]
  };
}

function toAssetInput(target: string) {
  if (/^https?:\/\//i.test(target)) {
    return {
      kind: "url" as const,
      url: target
    };
  }

  return {
    kind: "path" as const,
    path: target
  };
}

function parseMarkdownImage(line: string): RawBlock | undefined {
  const parsedLine = parseTrailingAnchor(line);
  const match = parsedLine.value.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);

  if (!match) {
    return undefined;
  }

  const [, altText, rawTarget] = match;
  const target = rawTarget.trim();

  return {
    kind: "image",
    asset: toAssetInput(target),
    caption: altText.trim() || undefined,
    anchorId: parsedLine.anchorId
  };
}

export function inferDefaultTitle(language: PptSourceInput["language"]): string {
  return language === "zh-CN" ? "未命名演示稿" : "Untitled Presentation";
}
