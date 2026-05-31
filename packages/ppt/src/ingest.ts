import { createSlideFromMarkdownChunk, inferDefaultTitle, parseMarkdownToChunks, renderTableAsText } from "./parser/markdown.js";
import { formatSpeakerNotes, parseSpeakerNotesText } from "./notes.js";
import { validateDeck, validateSourceInput } from "./schema.js";
import type {
  PptDeck,
  PptDeckBlock,
  PptDeckSlide,
  PptDeckStep,
  PptLanguage,
  PptSourceInput,
  PptxPresentationInput
} from "./types.js";

export function createDeckFromSource(input: PptSourceInput): PptDeck {
  const normalized = validateSourceInput(input);
  const deck =
    normalized.sourceKind === "markdown" ? createDeckFromMarkdown(normalized) : createDeckFromText(normalized);

  return validateDeck(deck);
}

export function deckToPptxInput(deck: PptDeck): PptxPresentationInput {
  const normalized = validateDeck(deck);

  return {
    title: normalized.title,
    slides: normalized.slides.map((slide: PptDeckSlide, slideIndex: number) => {
      const visibleBlocks = slide.steps.flatMap((step: PptDeckStep) => step.blocks);
      const headingBlock = visibleBlocks.find((block: PptDeckBlock) => block.kind === "heading");
      const bulletBlock = visibleBlocks.find((block: PptDeckBlock) => block.kind === "bullets");
      const textBlocks = visibleBlocks.filter(
        (block: PptDeckBlock): block is Extract<PptDeckBlock, { kind: "text" | "quote" | "callout" | "two-column" }> =>
          block.kind === "text" || block.kind === "quote" || block.kind === "callout" || block.kind === "two-column"
      );
      const metricsBlocks = visibleBlocks.filter(
        (block: PptDeckBlock): block is Extract<PptDeckBlock, { kind: "metrics" }> => block.kind === "metrics"
      );
      const timelineBlocks = visibleBlocks.filter(
        (block: PptDeckBlock): block is Extract<PptDeckBlock, { kind: "timeline" }> => block.kind === "timeline"
      );
      const comparisonBlocks = visibleBlocks.filter(
        (block: PptDeckBlock): block is Extract<PptDeckBlock, { kind: "comparison" }> => block.kind === "comparison"
      );
      const codeBlocks = visibleBlocks.filter(
        (block: PptDeckBlock): block is Extract<PptDeckBlock, { kind: "code" }> => block.kind === "code"
      );
      const tableBlocks = visibleBlocks.filter(
        (block: PptDeckBlock): block is Extract<PptDeckBlock, { kind: "table" }> => block.kind === "table"
      );
      const bodyParts: string[] = [];

      bodyParts.push(...textBlocks.map((block) => {
        if (block.kind === "quote") {
          return `"${block.text}"`;
        }

        if (block.kind === "callout") {
          return `Callout: ${block.text}`;
        }

        if (block.kind === "two-column") {
          return `Left:\n${block.left}\n\nRight:\n${block.right}`;
        }

        return block.text;
      }));
      bodyParts.push(...metricsBlocks.map((block) => block.items.map((item) => `${item.label}: ${item.value}`).join("\n")));
      bodyParts.push(...timelineBlocks.map((block) => block.items.map((item) => `${item.label}: ${item.detail}`).join("\n")));
      bodyParts.push(...comparisonBlocks.map((block) => block.items.map((item) => `${item.label}: ${block.leftTitle}=${item.left}; ${block.rightTitle}=${item.right}`).join("\n")));
      bodyParts.push(...codeBlocks.map((block) => (block.language ? `[${block.language}]\n${block.code}` : block.code)));
      bodyParts.push(...tableBlocks.map((block) => renderTableAsText(block.headers, block.rows)));

      return {
        title: slide.title ?? headingBlock?.text ?? `Slide ${slideIndex + 1}`,
        body: bodyParts.length > 0 ? bodyParts.join("\n\n") : undefined,
        bullets: bulletBlock?.kind === "bullets" ? bulletBlock.items : undefined,
        notes: formatSpeakerNotes(slide.notes, normalized.language)
      };
    })
  };
}

export function isDeckInput(input: unknown): input is PptDeck {
  return !!safeValidateDeck(input);
}

export function pptxInputToDeck(input: PptxPresentationInput, options?: { language?: PptLanguage; presetId?: PptDeck["presetId"] }): PptDeck {
  const language = options?.language ?? inferLanguageFromText([input.title, ...input.slides.map((slide) => `${slide.title} ${slide.body ?? ""}`)].join("\n"));
  const slides: PptDeckSlide[] = input.slides.map((slide, slideIndex) => {
    const steps: PptDeckStep[] = [];

    steps.push({
      id: `slide-${slideIndex + 1}-step-1`,
      blocks: [
        {
          id: `block-${slideIndex + 1}-heading`,
          kind: "heading",
          text: slide.title
        }
      ],
      transition: {
        kind: "none"
      }
    });

    if (slide.body?.trim()) {
      steps.push({
        id: `slide-${slideIndex + 1}-step-${steps.length + 1}`,
        blocks: [
          {
            id: `block-${slideIndex + 1}-text`,
            kind: "text",
            text: slide.body.trim()
          }
        ],
        transition: {
          kind: "fade"
        }
      });
    }

    if (slide.bullets && slide.bullets.length > 0) {
      steps.push({
        id: `slide-${slideIndex + 1}-step-${steps.length + 1}`,
        blocks: [
          {
            id: `block-${slideIndex + 1}-bullets`,
            kind: "bullets",
            items: slide.bullets
          }
        ],
        transition: {
          kind: "fade"
        }
      });
    }

    if (slide.image) {
      steps.push({
        id: `slide-${slideIndex + 1}-step-${steps.length + 1}`,
        blocks: [
          {
            id: `block-${slideIndex + 1}-image`,
            kind: "image",
            asset: slide.image
          }
        ],
        transition: {
          kind: "fade"
        }
      });
    }

    return {
      id: `slide-${slideIndex + 1}`,
      title: slide.title,
      notes: slide.notes ? parseSpeakerNotesText(slide.notes) : undefined,
      steps
    };
  });

  return validateDeck({
    title: input.title,
    language,
    sourceKind: "text",
    presetId: options?.presetId,
    slides
  });
}

function createDeckFromMarkdown(input: PptSourceInput): PptDeck {
  const chunks = parseMarkdownToChunks(input.content);
  const slides = chunks.map((chunk, index) => createSlideFromMarkdownChunk(chunk, index));
  const title = input.title ?? slides[0]?.title ?? inferDefaultTitle(input.language);

  return {
    title,
    language: input.language,
    sourceKind: input.sourceKind,
    presetId: input.presetId,
    slides
  };
}

function createDeckFromText(input: PptSourceInput): PptDeck {
  const sections = input.content
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean);

  const slides: PptDeckSlide[] = sections.map((section, index) => {
    const lines = section
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const firstLine = lines[0] ?? `Slide ${index + 1}`;
    const rest = lines.slice(1);
    const blocks: PptDeckBlock[] = [
      {
        id: `block-${index + 1}-heading`,
        kind: "heading",
        text: firstLine
      }
    ];

    if (rest.length > 0) {
      blocks.push({
        id: `block-${index + 1}-text`,
        kind: "text",
        text: rest.join(" ")
      });
    }

    return {
      id: `slide-${index + 1}`,
      title: firstLine,
      steps: blocks.map((block, blockIndex) => ({
        id: `slide-${index + 1}-step-${blockIndex + 1}`,
        blocks: [block],
        transition: {
          kind: blockIndex === 0 ? "none" : "fade"
        }
      }))
    };
  });

  return {
    title: input.title ?? slides[0]?.title ?? inferDefaultTitle(input.language),
    language: input.language,
    sourceKind: input.sourceKind,
    presetId: input.presetId,
    slides
  };
}

function inferLanguageFromText(content: string): PptLanguage {
  return /[\u3400-\u9fff]/.test(content) ? "zh-CN" : "en-US";
}

function safeValidateDeck(input: unknown): PptDeck | undefined {
  try {
    return validateDeck(input);
  } catch {
    return undefined;
  }
}
